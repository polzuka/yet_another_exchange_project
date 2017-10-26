'use strict';

const WebSocket = require('ws');
const SortedMap = require('collections/sorted-map');
const request = require('request-promise');
const Connector = require('./connector');
const ConnectorLoggingContainer = require('../logger');

const logger = ConnectorLoggingContainer.add('bitmex');


const BITMEX_WS_URL = 'wss://www.bitmex.com/realtime';

class BitmexConnector extends Connector {

  /**
   * Коннектимся к сокету.
   */
  init() {
    this.book.buySide = new SortedMap([], (a, b) => a === b, (a, b) => b - a);
    this.book.sellSide = new SortedMap([]);
    this.idToPrice = {};

    // Флаг показывающий, актуален ли стакан у коннектора
    this.isSynchronized = false;
    logger.info('Connecting to websocket.');
    this.ws = new WebSocket(BITMEX_WS_URL);
    this.ws.on('message', data => this.__onMessage(data));
    this.ws.on('open', () => this.__subscribe());
    this.ws.on('error', error => this.__onError(error));
    this.ws.on('close', event => this.__onClose(event));

    this.tradePartialFetched = false;
  }

  __onError(error) {
    logger.error('Socket error %j', error);
  }

  __onClose(event) {
    logger.error('Socket close %j', event);
    logger.warn(event);
    this.init();
  }

  __onSynchronized() {
    this.isSynchronized = true;
    this.emit('synchronized');
  }

  __sendRequest(data) {
    this.ws.send(JSON.stringify(data));
  }


  /**
   * Запрос, чтобы сервер не отключал коннектор.
   */
  __pong() {
    this.__sendRequest({e: 'pong'});
  }

  /**
   * Подписываемся на стакан и сделки.
   */
  __subscribe() {
    this.__orderBookSubscribe();
    this.__tradesSubscribe();
  }

  /**
   * Запрос на получение стакана и обновлений к нему.
   */
  __orderBookSubscribe() {
    logger.debug('Subscribe to book update.');
    this.__sendRequest({
      op: 'subscribe',
      args: [`orderBookL2:${this.splittedPair.join('')}`]
    });
  }


  /**
   * Запрос на получение сделок.
   * Deprecated. Куча косяков, возможно, следует обмазаться rest api.
   */
  __tradesSubscribe() {
    this.__sendRequest({
      op: 'subscribe',
      args: [`trade:${this.splittedPair.join('')}`]
    });
  }

  /**
   * Тут мы просто вешаем обработчики на события с биржи.
   */
  __onMessage(message) {
    const data = JSON.parse(message);
    // logger.info('****' + message);

    switch(data.table) {
      // case 'ping': return this.__onPing();
      // case 'auth': return this.__onAuthenticated(data);
      case 'orderBookL2': return this.__onOrderBookAction(data);
      case 'trade': return this.__onTradeAction(data);
      default: logger.debug(data);
    }
  }

  /**
   * Все понятно.
   */
  __onPing() {
    this.__pong();
  }

  __onOrderBookAction(data) {
    // this.__showBook();

    // If you receive any messages before the partial, ignore them.
    if (!this.isSynchronized && data.action !== 'partial')
      return;

    data.data.forEach(({id, side, size, price}) => {
      if (price)
        this.idToPrice[id] = price;
      else
        price = this.idToPrice[id];

      const bookSide = side === 'Buy' ? this.book.buySide : this.book.sellSide;
      data.action === 'delete'
        ? bookSide.delete(price)
        : bookSide.set(price, (1. * size / price).toFixed(5));
    });

    this.__onSynchronized();
  }

  __onTradeAction(data) {
    if (data.action !== 'insert' && data.action !== 'partial')
      logger.warn('%j', data);

    if (this.tradePartialFetched) {
      data.data.forEach(trade => this.emit('trade', this.__normalizeTradeInfo(trade)));
      return;
    }

    if (data.action === 'partial')
      this.tradePartialFetched = true;
  }


  __normalizeTradeInfo({side, timestamp, homeNotional, price}) {
    return {
      mic: this.constructor.mic,
      pair: this.pair,
      side: side.toUpperCase(),
      ts: new Date(timestamp).getTime(),
      amount: homeNotional,
      price: price
    };
  }

  __onHistoryUpdate(data) {
    data.data.forEach(trade => {
      this.emit('trade',  this.__normalizeTradeInfo(trade));
    });
  }

  async __requestHistory(from, to) {
    logger.debug(`from: ${from} to: ${to}`);
    const dtFrom = (new Date(from)).toISOString();
    const dtTo = (new Date(to)).toISOString();
    const filter = encodeURIComponent(`{"startTime":"${dtFrom}","endTime":"${dtTo}"}`);
    const url = `https://www.bitmex.com/api/v1/trade?symbol=${this.splittedPair[0]}${this.splittedPair[1]}&filter=${filter}`;
    const resp = await request.get(url);

    return JSON.parse(resp);
  }

  async __sleep(duration) {
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }

  async getTradeHistory(period) {
    const trades = [];
    const now = Date.now();
    let from = now - period * 1000;

    while (from < now) {
      let history = [];

      while (true) {
        try {
          history = await this.__requestHistory(from, now);
          break;
        }
        catch(e) {
          if (e.name == 'StatusCodeError' && e.statusCode == 429) {
            logger.debug("Rate limit exceeded. Sleeping...");
            await this.__sleep(1500);
          }
          else
            throw e;
        }
      }

      if (!history.length)
        break;

      history.every(t => {
        const ts = (new Date(t.timestamp)).getTime();
        trades.push({
          mic: this.constructor.mic,
          pair: this.pair,
          side: t.side.toUpperCase(),
          ts: (new Date(t.timestamp)).getTime(),
          price: t.price,
          amount: t.homeNotional
        });

        from = ts;
        return ts <= now ? true : false;
      });

      from++;
    }

    return trades;
  }
}

BitmexConnector.mic = 'BITMEX';

module.exports = BitmexConnector;
