'use strict';

const rp = require('request-promise');
const SortedMap = require('collections/sorted-map');
const Connector = require('./connector');
const ConnectorLoggingContainer = require('../logger');

const logger = ConnectorLoggingContainer.add('bittrex');


const KRAKEN_URL = 'https://api.kraken.com';
const API_VERSION = '0';

// We have safeguards in place to protect against abuse/DoS attacks 
// as well as order book manipulation caused by the rapid placing and canceling of orders.
// Every user of our API has a "call counter" which starts at 0.
// Ledger/trade history calls increase the counter by 2.
// Place/cancel order calls do not affect the counter.
// All other API calls increase the counter by 1.
// The user's counter is reduced every couple of seconds, 
// and if the counter exceeds the user's maximum API access is suspended for 15 minutes. 
// Tier 2 users have a maximum of 15 and their count gets reduced by 1 every 3 seconds. 
// Tier 3 and 4 users have a maximum of 20; the count is reduced by 1 every 2 seconds for tier 3 users,
// and is reduced by 1 every 1 second for tier 4 users.
// Although placing and cancelling orders does not increase the counter, 
// there are separate limits in place to prevent order book manipulation. 
// Only placing orders you intend to fill and keeping the rate down to 1 per second
// is generally enough to not hit this limit.
const REQUEST_FREQUENCY = 3000 ;


class KrakenConnector extends Connector {
  constructor(pair, apiKey, apiSecret, depth) {
    super(pair, apiKey, apiSecret, depth);
    this.book.ts = 0;
  }

  makeApiRequest(type, method, params={}) {
    return rp({
      uri: `${KRAKEN_URL}/${API_VERSION}/${type}/${method}`,
      qs: Object.assign(params, {nonce: Date.now()}),
      json: true
    });
  }

  __updateBook(data, ts) {
    // Нужно следить, что бы старый стакан не перетер более новый.
    if (this.book.ts > ts)
      return;

    // Приходит, например {"XXBTZUSD":{"asks":[["5589.60000","0.016",1507877548],...],"bids":[["5583.70000","3.344",1507877550],...]}}
    const book = Object.values(data)[0];

    this.book.buySide = new SortedMap(book.bids.map(([price, amount]) => [parseFloat(price), parseFloat(amount)]), (a, b) => a === b, (a, b) => b - a);
    this.book.sellSide = new SortedMap(book.asks.map(([price, amount]) => [parseFloat(price), parseFloat(amount)]));
    this.book.ts = ts;
  }

  __normalizeTradeInfo([price, amount, ts, type]) {
    return {
      mic: this.constructor.mic,
      pair: this.pair,
      side: type === 'b' ? 'buy' : 'sell',
      ts: ts * 1000,
      amount,
      price
    };
  }

  __checkNewTrades(data) {
    const lastTradeId = data.last;
    delete data.last;
    const trades = Object.values(data)[0];

    if (this.lastTradeId !== undefined)
      trades.forEach(trade => this.emit('trade', this.__normalizeTradeInfo(trade)));

    this.lastTradeId = lastTradeId;
  }

  async __fetchBook() {
    try {
      const ts = Date.now();
      const response = await this.makeApiRequest(
        'public',
        'Depth',
        {
          pair: this.splittedPair.join(''),
          count: this.depth
        }
      );

      if (response.error.length) {
        logger.error('Orderbook fetching error: %j', response.error);
        return;
      }

      this.__updateBook(response.result, ts);
      // // this.__showBook();
      this.__onSynchronized();
    } catch (e) {
      logger.error('Orderbook fetching error: %s', e);
    }
  }

  async __fetchTrades() {
    try {
      const response = await this.makeApiRequest(
        'public',
        'Trades',
        {pair: this.splittedPair.join(''), since: this.lastTradeId}
      );

      if (response.error.length) {
        logger.error('Trade history fetching error: %j', response.error);
        return;
      }

      this.__checkNewTrades(response.result);
    } catch (e) {
      logger.error('Trade history fetching error: %s', e);
    }
  }

  *__requestGenerator() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      yield this.__fetchBook.bind(this);
      yield this.__fetchTrades.bind(this);
    }
  }

  init() {
    // Флаг показывающий, актуален ли стакан у коннектора
    this.isSynchronized = false;

    // Поочередно спрашивем стакан и ордера 
    const apiRequest = this.__requestGenerator();
    setInterval(() => apiRequest.next().value(), REQUEST_FREQUENCY);
  }


  __onSynchronized() {
    this.isSynchronized = true;
    this.emit('synchronized');
  }
}

KrakenConnector.mic = 'KRAKEN';

module.exports = KrakenConnector;