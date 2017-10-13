'use strict';

const rp = require('request-promise');
const SortedMap = require('collections/sorted-map');
const Connector = require('./connector');
const ConnectorLoggingContainer = require('../logger');

const logger = ConnectorLoggingContainer.add('bittrex');


const BITTREX_URL = 'https://bittrex.com/api/';
const API_VERSION = '1.1';
const REQUEST_FREQUENCY = 1000;


class BittrexConnector extends Connector {
  constructor(pair, apiKey, apiSecret, depth) {
    super(pair, apiKey, apiSecret, depth);
    this.book.ts = 0;

  }

  makeApiRequest(type, method, params={}) {
    return rp({uri: `${BITTREX_URL}v${API_VERSION}/${type}/${method}`, qs: params, json: true});
  }

  __updateBook(data, ts) {
    // Нужно следить, что бы старый стакан не перетер более новый.
    if (this.book.ts > ts)
      return;

    this.book.buySide = new SortedMap(data.buy.slice(0, this.depth).map(e => [e.Rate, e.Quantity]), (a, b) => a === b, (a, b) => b - a);
    this.book.sellSide = new SortedMap(data.sell.slice(0, this.depth).map(e => [e.Rate, e.Quantity]));
    this.book.ts = ts;
  }

  __normalizeTradeInfo({TimeStamp, Quantity, Price, OrderType}) {
    return {
      mic: this.constructor.mic,
      pair: this.pair,
      side: OrderType,
      ts: new Date(TimeStamp).getTime(),
      amount: Quantity,
      price: Price
    };
  }

  __checkNewTrades(trades) {
    if (this.oldTrades) {
      const index = trades.findIndex(trade => trade.Id === this.oldTrades[0].Id);
      if (index === -1)
        logger.warning('No trades intersection.');
      const newTrades = index === -1 ? trades : trades.slice(0, index);
      newTrades.forEach(trade => this.emit('trade', this.__normalizeTradeInfo(trade)));
    }

    this.oldTrades = trades;
  }

  async __fetchBook() {
    try {
      const ts = Date.now();
      const response = await this.makeApiRequest(
        'public',
        'getorderbook',
        {
          market: this.splittedPair.join('-'),
          type: 'both'
        }
      );

      if (!response.success) {
        logger.error('Orderbook fetching error: %s', response.message);
        return;
      }

      this.__updateBook(response.result, ts);
      // this.__showBook();
      this.__onSynchronized();
    } catch (e) {
      logger.error('Orderbook fetching error: %s', e);
    }
  }

  async __fetchTrades() {
    try {
      const response = await this.makeApiRequest(
        'public',
        'getmarkethistory',
        {market: this.splittedPair.join('-')}
      );

      if (!response.success) {
        logger.error('Trade history fetching error: %s', response.message);
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

    // The limit is measured per IP address and per account. 
    // So for one account (regardless of the number of key/secret pairs) 
    // 60 requests per minute can be made via our API. 
    // When you are using multiple connections (IP addresses), 
    // the combined sum of all request for the account in question
    // will used to determine if you are below the 60/minute limit.

    // Поочередно спрашивем стакан и ордера 
    const apiRequest = this.__requestGenerator();
    setInterval(() => apiRequest.next().value(), REQUEST_FREQUENCY);
  }


  __onSynchronized() {
    this.isSynchronized = true;
    this.emit('synchronized');
  }
}

BittrexConnector.mic = 'BITTREX';

module.exports = BittrexConnector;