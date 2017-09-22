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
    this.realDepth = Math.round(this.depth * 1.1);
    this.requestId = 0;
    this.book = {
      pair,
      buySide: null,
      sellSide: null,
      dt: null,
      id: null

    };

    this.ws = new WebSocket(CEX_WS_URL);
    this.ws.on('message', data => this.__onMessage(data));
    this.ws.on('open', () => this.__auth());
  }

  __initBook(data) {
    this.book.buySide = new SortedMap(data.data.bids, (a, b) => a === b, (a, b) => b - a);
    this.book.sellSide = new SortedMap(data.data.asks);
    this.book.ts = data.data.timestamp;
    this.book.id = null;
    this.__showBook()

  }

  __updateSide(side, data) {
    const newSide = side.clone();
    data.forEach(([price, amount]) => {
      if (amount === 0)
        newSide.delete(price);
      else
        newSide.set(price, amount);
    });

    if (newSide.length < this.depth) {
      this.__orderBookSubscribe();
      return null;
    }

    if (newSide.length > this.realDepth) 
      newSide.keys().forEach((price, i) => {
        if (i >= this.realDepth)
          newSide.delete(price);
      });

    return newSide;
  }

  __updateBook(data) {
    const newBuySide = this.__updateSide(this.book.buySide, data.data.bids);
    const newSellSide = this.__updateSide(this.book.sellSide, data.data.asks);
    if (!newBuySide || !newSellSide) {
      return;
    }

    this.book.buySide = newBuySide;
    this.book.sellSide = newSellSide;

    this.book.ts = data.data.time;
    this.__showBook()
  }


  __showBook() {
    const asks = this.book.sellSide.entries().map(([price, amount]) => `${price} = ${amount}`);
    const maxAsksLength = asks.map(ask => ask.length).sort()[asks.length - 1];
    const bids = this.book.buySide.entries().map(([price, amount]) => `${price} = ${amount}`);

    let s = '\n';
    for (let i = 0; i < Math.max(asks.length, bids.length); i++) {
      const ask = asks[i] || '';
      const bid = bids[i] || '';
      const l = ask + ' '.repeat(maxAsksLength - ask.length + 4) + bid + '\n';
      s += l;
    }
    logger.info(s);
  }


  __createSignature(timestamp, apiKey, apiSecret) {
    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(timestamp + apiKey);
    return hmac.digest('hex');
  }

  __getOid() {
    return `${Date.now()}_${this.requestId}`;
  }

  __sendRequest(data) {
    this.ws.send(JSON.stringify(data));
  }

  __pong() {
    this.__sendRequest({e: 'pong'});
  }

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

  __orderBookSubscribe() {
    logger.info('!'.repeat(100))
    this.__sendRequest({
      e: 'order-book-subscribe',
      data: {
      pair: [
            'BTC',
            'USD'
            ],
            subscribe: true,
            depth: this.realDepth
      },
      oid: this.__getOid()
    });
  }

  __onMessage(message) {
    const data = JSON.parse(message);
    // logger.info(message);

    switch(data.e) {
      case 'ping': return this.__onPing();
      case 'auth': return this.__onAuthenticated();
      case 'order-book-subscribe': return this.__onOrderBookSubscribed(data);
      case 'md_update': return this.__onOrderBookUpdated(data);
      default: logger.info(data);
    }
  }

  __onTrade(data) {
    logger.info(data);

  }

  __onPing() {
    this.__pong();
  }

  __onAuthenticated() {
    this.__orderBookSubscribe();
    this.emit('connected');
  }

  __onOrderBookSubscribed(data) {
    this.__initBook(data);
    this.emit('something_event')
  }

  __onOrderBookUpdated(data) {
    this.__updateBook(data);
    this.emit('something_event')
  }
}

module.exports = CexConnector;