'use strict';

const autobahn = require('autobahn');
const poloniex = require('@you21979/poloniex.com');
const SortedMap = require('collections/sorted-map');
const request = require('request-promise');
const WebSocket = require('ws');

const Connector = require('./connector');
const ConnectorLoggingContainer = require('../logger');

const POLONIEX_USER_AGENT = "yet_another_trading_app";
const POLONIEX_WS_URL = "wss://api2.poloniex.com";
const SELL_SIDE = 0;
const BUY_SIDE = 1;

const logger = ConnectorLoggingContainer.add('poloniex');



class PoloniexConnector extends Connector {
  constructor(pair, apiKey, apiSecret, depth) {
    super(pair, apiKey, apiSecret, depth);
    // this.api = poloniex.createPrivateApi(apiKey, apiSecret, POLONIEX_USER_AGENT);
  }

  init() {
    super.init();
    this.__connect();
  }

  __connect() {
    logger.info("Connecting to websocket");
    this.ws = new WebSocket(POLONIEX_WS_URL);
    this.ws.on('open', () => this.__onOpen());
    this.ws.on('close', event => this.__onClose(event));
    this.ws.on('error', error => this.__onError(error));
    this.ws.on('message', message => this.__onMessage(message));
  }

  __normalizeSide(side) {
    const res = [];
    Object.keys(side).every((p, i) => {
      if (i >= this.maxDepth)
        return false;

      res.push([Number(p), Number(side[p])]);
      return true;
    });

    return res;
  }

  static __normalizeTradeInfo() {}

  __onOpen() {
    logger.info("Socket connected");
    this.__subscribe();
  }

  __onClose(event) {
    logger.info("Socket closed");
    this.__connect();
  }

  __onError(error) {
    logger.error("WebSocket error: " + error);
    setTimeout(() => this.__connect(), 1000);
  }

  __onMessage(message) {
    const data = JSON.parse(message);

    // Пришел ping
    if (data.length == 1 && data[0] === 1010)
      return;

    if (data.length == 2) {
      if (data[1] == 0)
        return this.__onUnsubscribe();

      if (data[1] == 2)
        return;
    }

    // logger.info(message);
    const seq = data[1];

    // Если пришел не следующий seq номер, то переподписываемся на канал
    if (this.seq && seq != this.seq + 1) {
      logger.debug("DATA: " + message);
      logger.debug("Invalid sequence number. Current:" + this.seq + " got: " + seq + " Resubscribing");
      this.seq = 0;
      this.ws.close();
      return;
    }

    this.seq = seq;
    data[2].forEach(d => this.__processEvent(d));
  }

  __subscribe() {
    logger.debug("Subscribing to info channel");
    this.__sendRequest({ command: "subscribe", channel: this.pair});
  }

  __unsubscribe() {
    logger.debug("Unsubscribing to info channel");
    this.isSynchronized = false;
    this.__sendRequest({ command: "subscribe", channel: this.pair});
  }

  __onUnsubscribe() {
    this.__connect();
  }

  __processEvent(e) {
    switch (e[0]) {
      case "i":
        this.__initOrderBook(e);
        break;

      case "o":
        // logger.info(e);
        this.__updateOrderBook(e);
        break;

      case "t":
        this.__onTrade(e);

      default:
    }
  }

  __initOrderBook(e) {
    if (e[1].currencyPair !== this.pair) {
      logger.error("Got an invalid currencyPair value: " + e[1].currencyPair)
      return this.__unsubscribe();
    }

    const ob = e[1].orderBook;

    this.book.sellSide = new SortedMap(this.__normalizeSide(ob[SELL_SIDE]));
    this.book.buySide = new SortedMap(this.__normalizeSide(ob[BUY_SIDE]), (a, b) => a === b, (a, b) => b - a);
    // Для стакана poloniex timestamp не возвращает, поэтому берем местный
    this.book.dt = Date.now();
    this.isSynchronized = true;
    this.emit('synchronized');
    this.__showBook();
  }

  __updateOrderBook(e) {
    const [, side, price, amount] = e;
    const s = side == BUY_SIDE ? this.book.buySide : this.book.sellSide;

    if (parseFloat(amount) == 0) {
      s.delete(Number(price));

      // Если глубина стакана недостаточная, то пересасываем
      if (s.length < this.depth)
        return this.__unsubscribe();
    }
    else
      s.set(Number(price), Number(amount));

    this.book.dt = Date.now();
    // this.__showBook();
  }

  __onTrade([,,side, price, amount, ts]) {
    const trade = {
      mic: this.constructor.mic,
      pair: this.pair,
      side: side == BUY_SIDE ? 'BUY' : 'SELL',
      ts: parseInt(ts) * 1000,
      amount: Number(amount),
      price: Number(price)
    }

    this.emit('trade', trade);
  }

  __sendRequest(data) {
    this.ws.send(JSON.stringify(data));
  }

  async getTradeHistory(period) {
    const now = Math.trunc(Date.now() / 1000);
    const from = now - period;
    const trades = [];
    const url = `https://api.poloniex.com/public?command=returnTradeHistory&currencyPair=${this.pair}&start=${from}&end=${now}`;
    
    return new Promise((resolve, reject) => {
      request(url)
        .then(response => {
          const res = JSON.parse(response);
          res.forEach(t => {
            trades.push({
              mic: this.constructor.mic,
              pair: this.pair,
              side: t.type.toUpperCase(),
              ts: Date.parse(t.date),
              amount: Number(t.amount),
              price: Number(t.rate)
            });
          });

          resolve(trades);
        })
        .catch(err => {
          reject(err);
        })
    });
  }
}

PoloniexConnector.mic = 'POLONIEX';

module.exports = PoloniexConnector;
