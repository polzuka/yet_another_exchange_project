'use strict';

const crypto = require('crypto');
const WebSocket = require('ws');
const SortedMap = require('collections/sorted-map');
const Connector = require('./connector');
const ConnectorLoggingContainer = require('../logger');

const logger = ConnectorLoggingContainer.add('cex');



const CEX_WS_URL = 'wss://ws.cex.io/ws/';

class CexConnector extends Connector {
  constructor(pair, apiKey, apiSecret, depth) {
    super(pair, apiKey, apiSecret, depth);

    // Если делать стакан глубиной depth, то он часто опустошается и приходится его переподгружать.
    // Поэтому реальная глубина стакана будет depth <= realDepth <= maxDepth
    this.maxDepth = Math.round(this.depth * 1.1);
    this.requestId = 0;

    // Стакан
    this.book = {
      pair: this.pair.join(''),
      buySide: null,
      sellSide: null,
      dt: null,
      id: null

    };

    // Флаг показывающий, актуален ли стакан у коннектора
    this.synced = false;

    // Сразу коннектимся к сокету
    this.ws = new WebSocket(CEX_WS_URL);
    this.ws.on('message', data => this.__onMessage(data));
    this.ws.on('open', () => this.__auth());
  }

  /**
   * Проинициализировать стакан данными с биржи.
   * После инициализации synced = true.
   *
   * @param data {Object} данные с биржи в формате {data: {timestamp, bids: [[price, amount][,...]], asks: [[price, amount][,...]]}}
   * @returns {undefined}
   */
  __initBook(data) {
    this.book.buySide = new SortedMap(data.data.bids, (a, b) => a === b, (a, b) => b - a);
    this.book.sellSide = new SortedMap(data.data.asks);
    this.book.ts = data.data.timestamp;
    this.book.id = null;
    this.synced = true;
    this.__showBook()
  }

  /**
   * Обновляет сторону стакана.
   * Если коннектор не синхронизирован с биржей (!synced), ничего не обновляет.
   *
   * @param side {Object} сторона стакана у коннектора {price: amount,...}
   * @param data {Array} сторона стакана c биржи [[price, amount][,...]]
   * @returns {Object} or {null} обновленная сторона стакана.
   */
  __updateSide(side, data) {
    if (!this.synced)
      return null;

    const newSide = side.clone();
    // Обновляем сторону стакана
    data.forEach(([price, amount]) => {
      // Если объем нулевой, выкинем из стакана
      if (amount === 0)
        newSide.delete(price);
      else
        newSide.set(price, amount);
    });

    // Если глубина слишком уменьшилась надо пересосать.
    // Скидываем статус коннектора в false и отписываемся от обновлений стакана
    if (newSide.length < this.depth) {
      this.synced = false;
      this.__orderBookUnsubscribe();
      return null;
    }

    // Если стакан стал слишком глубоким, обрежем его.
    if (newSide.length > this.maxDepth) 
      newSide.keys().forEach((price, i) => {
        if (i >= this.maxDepth)
          newSide.delete(price);
      });

    return newSide;
  }

  __updateBook(data) {
    this.book.buySide = this.__updateSide(this.book.buySide, data.data.bids);
    this.book.sellSide = this.__updateSide(this.book.sellSide, data.data.asks);
    this.book.ts = data.data.time;
    this.__showBook()
  }


  __showBook() {
    if (!this.synced) {
      logger.info('desync');
      return;
    }

    const asks = this.book.sellSide.entries().map(([price, amount]) => `${price} = ${amount}`);
    const maxAsksLength = asks.map(ask => ask.length).slice(0, this.depth).sort((a, b) => a - b)[this.depth - 1];

    const bids = this.book.buySide.entries().map(([price, amount]) => `${price} = ${amount}`);

    let s = '\n';
    for (let i = 0; i < this.depth; i++) {
      const l = asks[i] + ' '.repeat(maxAsksLength - asks[i].length + 4) + bids[i] + '\n';
      s += l;
    }
    logger.info(s);
  }


  __createSignature(timestamp, apiKey, apiSecret) {
    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(timestamp + apiKey);
    return hmac.digest('hex');
  }

  __getOid(receiver) {
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
    logger.info('!'.repeat(100))
    this.__sendRequest({
      e: 'order-book-subscribe',
      data: {
        pair: this.pair,
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
    this.__sendRequest({
      e: 'order-book-unsubscribe',
      data: {pair: this.pair},
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
      rooms: [`pair-${this.pair.join('-')}`]
    });
  }

  /**
   * Тут мы просто вешаем обработчики на события с биржи.
   */
  __onMessage(message) {
    const data = JSON.parse(message);
    logger.info(message);

    switch(data.e) {
      case 'ping': return this.__onPing();
      case 'auth': return this.__onAuthenticated();
      case 'order-book-subscribe': return this.__onOrderBookSubscribed(data);
      case 'order-book-unsubscribe': return this.__onOrderBookUnsubscribe(data);
      case 'md_update': return this.__onOrderBookUpdated(data);
      default: logger.info(data);
    }
  }

  __onTrade(data) {
    logger.info(data);

  }

  /**
   * Все понятно.
   */
  __onPing() {
    this.__pong();
  }

  /**
   * Как только подключились и авторизовались, дернем стакан.
   */
  __onAuthenticated() {
    this.__orderBookSubscribe();
    this.emit('connected');
  }

  /**
   * Заполним стакан у коннектора.
   */
  __onOrderBookSubscribed(data) {
    this.__initBook(data);
    this.emit('something_event')
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
    this.__updateBook(data);
    this.emit('something_event')
  }
}

module.exports = CexConnector;