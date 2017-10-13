'use strict';

const crypto = require('crypto');
const WebSocket = require('ws');
const SortedMap = require('collections/sorted-map');
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
    // If you receive any messages before the partial, ignore them.
    if (!this.synchronized && data.action !== 'partial')
      return;

    data.data.forEach(({side, size, price}) => {
      const bookSide = side === 'Buy' ? this.book.buySide : this.book.sellSide;
      data.action === 'delete'
        ? bookSide.delete(price)
        : bookSide.set(price, 1. * size / price);
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
}

BitmexConnector.mic = 'BITMEX';

module.exports = BitmexConnector;