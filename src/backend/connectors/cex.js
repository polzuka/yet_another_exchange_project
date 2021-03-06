'use strict';

const crypto = require('crypto');
const request = require('request-promise');
const SortedMap = require('collections/sorted-map');
const WebSocket = require('ws');

const Connector = require('./connector');
const ConnectorLoggingContainer = require('../logger');

const logger = ConnectorLoggingContainer.add('cex');


const CEX_WS_URL = 'wss://ws.cex.io/ws/';

class CexConnector extends Connector {
  constructor(pair, apiKey, apiSecret, depth) {
    super(pair, apiKey, apiSecret, depth);
    this.requestId = 0;
  }

  /**
   * Коннектимся к сокету.
   */
  init() {
    // Флаг показывающий, актуален ли стакан у коннектора
    this.isSynchronized = false;
    logger.info('Connecting to websocket.');
    this.ws = new WebSocket(CEX_WS_URL);
    this.ws.on('message', data => this.__onMessage(data));
    this.ws.on('open', () => this.__auth());
    this.ws.on('error', error => this.__onError(error));
    this.ws.on('close', event => this.__onClose(event));
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

  /**
   * Проинициализировать стакан данными с биржи.
   * После инициализации isSynchronized = true.
   *
   * @param data {Object} данные с биржи в формате {data: {timestamp, bids: [[price, amount][,...]], asks: [[price, amount][,...]]}}
   * @returns {undefined}
   */
  __initBook(data) {
    this.book.buySide = new SortedMap(data.data.bids, (a, b) => a === b, (a, b) => b - a);
    this.book.sellSide = new SortedMap(data.data.asks);
    this.book.ts = data.data.timestamp;
    this.book.id = data.data.id;
    this.__onSynchronized();
    // this.__showBook();
  }

  /**
   * Обновляет сторону стакана.
   *
   * @param side {Object} сторона стакана у коннектора {price: amount,...}
   * @param data {Array} сторона стакана c биржи [[price, amount][,...]]
   * @returns {Object} or {null} обновленная сторона стакана.
   */
  __updateSide(side, data) {
    const newSide = side.clone();
    // Обновляем сторону стакана
    data.forEach(([price, amount]) => {
      // Если объем нулевой, выкинем из стакана
      if (amount === 0)
        newSide.delete(price);
      else
        newSide.set(price, amount);
    });

    return newSide;
  }

  __updateBook(data) {
    // Если пропустили данные (не совпадает порядковый номер обновления со следующим номером у нас).
    if (this.book.id + 1 !== data.data.id)
      return this.__orderBookUnsubscribe();

    const newBuySide = this.__updateSide(this.book.buySide, data.data.bids);
    const newSellSide = this.__updateSide(this.book.sellSide, data.data.asks);

    this.book.buySide = newBuySide;
    this.book.sellSide = newSellSide;
    this.book.ts = data.data.time;
    this.book.id = data.data.id;
    this.__onSynchronized();
    // this.__showBook();
  }

  __createSignature(timestamp, apiKey, apiSecret) {
    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(timestamp + apiKey);
    return hmac.digest('hex');
  }

  __getOid(receiver) {
    this.requestId++;
    return `${Date.now()}_${this.requestId}_${receiver}`;
  }

  __sendRequest(data) {
    this.ws.send(JSON.stringify(data));
  }


  /**
   * Запрос, что бы сервер не отключал коннектор.
   */
  __pong() {
    this.__sendRequest({e: 'pong'});
  }

  /**
   * Запрос на авторизацию.
   */
  __auth() {
    const timestamp = Math.floor(Date.now() / 1000);
    this.__sendRequest({
      e: 'auth',
      auth: {
        key: this.apiKey,
        signature: this.__createSignature(timestamp, this.apiKey, this.apiSecret),
        timestamp: timestamp
      }
    });
  }

  /**
   * Запрос на получение стакана и обновлений к нему.
   */
  __orderBookSubscribe() {
    logger.debug('Subscribe to book update.');
    this.__sendRequest({
      e: 'order-book-subscribe',
      data: {
        pair: this.splittedPair,
        subscribe: true,
        depth: this.maxDepth
      },
      oid: this.__getOid('order-book-subscribe')
    });
  }

  /**
   * Запрос на отписку от обновлений стакана.
   */
  __orderBookUnsubscribe() {
    logger.debug('Unsubscribe to book update.');
    this.isSynchronized = false;
    this.__sendRequest({
      e: 'order-book-unsubscribe',
      data: {pair: this.splittedPair},
      oid: this.__getOid('order-book-subscribe')
    });
  }

  /**
   * Запрос на получение сделок.
   * Deprecated. Куча косяков, возможно, следует обмазаться rest api.
   */
  __pairRoomSubscribe() {
    this.__sendRequest({
      e: 'subscribe',
      rooms: [`pair-${this.splittedPair.join('-')}`]
    });
  }

  /**
   * Тут мы просто вешаем обработчики на события с биржи.
   */
  __onMessage(message) {
    const data = JSON.parse(message);
    // logger.info('****' + message);

    switch(data.e) {
      case 'ping': return this.__onPing();
      case 'auth': return this.__onAuthenticated(data);
      case 'order-book-subscribe': return this.__onOrderBookSubscribed(data);
      case 'order-book-unsubscribe': return this.__onOrderBookUnsubscribe(data);
      case 'md_update': return this.__onOrderBookUpdated(data);
      case 'history-update': return this.__onHistoryUpdate(data);

      case 'md':
      case 'history':
      case 'md_groupped':
      case 'ohlcv24':
        return; // Игнорируем мусор

      default: logger.debug(data);
    }
  }

  __onTrade(data) {
    logger.debug(data);

  }

  /**
   * Все понятно.
   */
  __onPing() {
    this.__pong();
  }

  /**
   * Как только подключились и авторизовались, дернем стакан и начнем слушать сделки.
   */
  __onAuthenticated(data) {
    if (data.ok === 'error')
      throw new Error(`Authentication error '${data.data.error}'.`);

    this.__orderBookSubscribe();
    this.__pairRoomSubscribe();
  }

  /**
   * Заполним стакан у коннектора.
   */
  __onOrderBookSubscribed(data) {
    this.__initBook(data);
    this.emit('something_event');
  }

  /**
   * Переподпишимся.
   */
  __onOrderBookUnsubscribe() {
    this.__orderBookSubscribe();
  }

  /**
   * Обновим стакан.
   */
  __onOrderBookUpdated(data) {
    if (!this.isSynchronized)
      return;
    this.__updateBook(data);
    this.emit('something_event');
  }

  __normalizeTradeInfo([side, ts, amount, price, ]) {
    return {
      mic: this.constructor.mic,
      pair: this.pair,
      side: side.toUpperCase(),
      ts: parseInt(ts, 10),
      amount: Number(amount) / 1e8,
      price: Number(price)
    };
  }

  __onHistoryUpdate(data) {
    data.data.forEach(trade => {
      this.emit('trade',  this.__normalizeTradeInfo(trade));
    });
  }

  async __requestHistory(tid) {
    const url = (`https://cex.io/api/trade_history/${this.splittedPair[0]}/${this.splittedPair[1]}/` + (tid ? `?since=${tid}` : ''));
    // logger.debug("URL: " + url);
    const resp = await request.get(url);

    return JSON.parse(resp);
  }

  async getTradeHistory(period) {
    const now = Math.trunc(Date.now() / 1000);
    const dtFrom = now - period;
    const trades = [];

    let ts = now;
    let tid = 0;

    // Будем вытаскивать историю до тех пор, пока не вытащим за весь период
    while (ts >= dtFrom) {
      // logger.debug(`ts: ${ts} dtFrom: ${dtFrom}`);
      const trd = await this.__requestHistory(tid);

      // Если timestamp уже раньше, чем надо, то хорош
      trd.every(t => {
        ts = parseInt(t.date);

        if (ts < dtFrom)
          return false;

        trades.push({
          mic: this.constructor.mic,
          pair: this.pair,
          side: t.type.toUpperCase(),
          price: Number(t.price),
          amount: Number(t.amount),
          ts: ts
        });

        tid = parseInt(t.tid);
        return true;
      });

      tid -= 1000;
    }

    return trades;
  }

  async getHistory(period) {
    const history = [];
    const trades = await this.getTradeHistory(period);

    trades.forEach(t => {
      history.push({
        ts: t.ts,
        price: t.price
      });
    });

    return history;
  }
}

CexConnector.mic = 'CEXIO';

module.exports = CexConnector;
