'use strict';

const WebSocket = require('ws');
const SortedMap = require('collections/sorted-map');
const Connector = require('./connector');
const ConnectorLoggingContainer = require('../logger');

const logger = ConnectorLoggingContainer.add('bitfinex');



const BITFINEX_WS_URL = 'wss://api.bitfinex.com/ws/2';

class BitfinexConnector extends Connector {
  constructor(pair, apiKey, apiSecret, depth) {
    super(pair, apiKey, apiSecret, depth);

    // Если делать стакан глубиной depth, то он часто опустошается и приходится его переподгружать.
    // Поэтому реальная глубина стакана будет depth <= realDepth <= maxDepth
    this.maxDepth = Math.round(this.depth * 1.1);

    

    // Флаг показывающий, актуален ли стакан у коннектора
    this.synced = false;

    this.tradesChanId = null;
    this.bookChanId = null;
  }

  /**
   * Коннектимся к сокету.
   */
  init() {
    this.ws = new WebSocket(BITFINEX_WS_URL);
    this.ws.on('message', data => this.__onMessage(data));
    this.ws.on('open', () => this.__onSocketOpen());
  }

  __sendRequest(data) {
    this.ws.send(JSON.stringify(data));
  }

  __onSocketOpen() {
    this.__bookSubscribe();
    this.__tradesSubscribe();
  }

  __onMessage(message) {
    const data = JSON.parse(message);
    // logger.info(message);

    switch(data.event) {
      case 'subscribed': return this.__onSubscribed(data);
      case undefined: return this.__onData(data);
      default: logger.debug(data);
    }
  }

  __tradesSubscribe() {
    this.__sendRequest({
      event: 'subscribe',
      channel: 'trades', 
      symbol: `t${this.pair.join('')}` 
    });
  }

  __bookSubscribe() {
    this.__sendRequest({
      event: 'subscribe',
      channel: 'book', 
      symbol: `t${this.pair.join('')}`,
      prec: 'P0',
      freq: 'F0',
      len: this.realDepth
    });
  }

  __onSubscribed(data) {
    switch (data.channel) {
      case 'trades': 
        this.tradesChanId = data.chanId;
        return;
      case 'book':
        this.bookChanId = data.chanId;
        return;
    }
  }

  __onData(data) {
    const chanId = data[0];
    switch (chanId) {
      case this.bookChanId: return this.__onBookData(data);
      case this.tradesChanId: return this.__onTradesData(data);
      default: logger.debug(data);
    }
  }

  __onBookData([, data]) {
    const type = typeof data[0];

    switch (type) {
      case 'object': return this.__onBookSnapshot(data);
      case 'number': return this.__onBookUpdate(data);
      case 'string': return this.__onChannelHb(data);
      default: throw new Error(`Unexpected type '${type}'`);
    }
  }

  __onChannelHb(data) {
    if (data !== 'hb') {
      throw new Error(`Unexpected data ${data}`);
    }
  }

  __onBookSnapshot(positions) {
    this.book.buySide = new SortedMap([], (a, b) => a === b, (a, b) => b - a);
    this.book.sellSide = new SortedMap([]);

    positions.forEach(([price, , amount]) => {
      if (amount > 0) 
        this.book.buySide.set(price, amount);
      else
        this.book.sellSide.set(price, -amount);

    });
    this.book.ts = Date.now();
    this.emit('synced');
    this.__showBook();
  }

  __onBookUpdate([price, count, amount]) {
    if (count > 0) {
      if (amount > 0) 
        this.book.buySide.set(price, amount);
      else
        this.book.sellSide.set(price, -amount);
    } else {
      if (amount > 0) 
        this.book.buySide.delete(price);
      else
        this.book.sellSide.delete(price);
    }
    this.book.ts = Date.now();

    this.__showBook();
  }

  __normalizeTradeInfo([, mts, amount, price]) {
    return {
      side: amount > 0 ? 'BUY' : 'SELL',
      dt: mts, 
      amount: amount,
      price: price
    }
  }

  __onTradesData(data) {
    const [, event, trade] = data;
    switch (event) {
      case 'hb': return;
      case 'te': return this.emit('trade', this.__normalizeTradeInfo(trade));
    }
  }
}

module.exports = BitfinexConnector;