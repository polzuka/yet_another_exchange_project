'use strict';

const EventEmitter = require('events');
const ConnectorLoggingContainer = require('../logger');

const logger = ConnectorLoggingContainer.add('connector');


class Connector extends EventEmitter {
  constructor(pair, apiKey, apiSecret, depth = 10) {
    super();

    if (this.constructor.mic === undefined)
      throw new Error('MIC (market identification code) must be specified.');

    this.pair = pair,
    this.splittedPair = pair.split('_');
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.depth = depth;

    // Стакан
    this.book = {
      buySide: null,
      sellSide: null,
      dt: null
    };

    // Если делать стакан глубиной depth, то он часто опустошается и приходится его переподгружать.
    // Поэто  му реальная глубина стакана будет depth <= realDepth <= maxDepth
    this.maxDepth = Math.round(this.depth * 1.1);
  }

  init() {
    // Флаг показывающий, актуален ли стакан у коннектора
    this.isSynchronized = false;
  }

  __showBook() {
    const asks = this.book.sellSide.entries().map(([price, amount]) => `${price} = ${amount}`);
    const maxAsksLength = asks.map(ask => ask.length).slice(0, this.depth).sort((a, b) => a - b)[this.depth - 1];
    const bids = this.book.buySide.entries().map(([price, amount]) => `${price} = ${amount}`);
    // logger.info(JSON.stringify(asks));
    let s = `\nASKS${' '.repeat(maxAsksLength)}BIDS\n`;
    for (let i = 0; i < this.depth; i++)
      s += asks[i] + ' '.repeat(maxAsksLength - (asks[i] || '').length + 4) + bids[i] + '\n';
    logger.info(s);
  }

  __normalizeBookInfo(book) {
    return {
      buySide: book.buySide.toJSON().slice(0, this.depth),
      sellSide: book.sellSide.toJSON().slice(0, this.depth),
      ts: book.ts,
      pair: this.pair,
      mic: this.constructor.mic
    };
  }

  getBook() {
    return new Promise(resolve => {
      if (this.isSynchronized)
        return resolve(this.__normalizeBookInfo(this.book));
      this.once('synchronized', () => resolve(this.__normalizeBookInfo(this.book)));
    });
  }

  // Вовзвращает историю сделок за period секунд от текущего момента
  async getTradeHistory(period) {
    throw new Error("getTradeHistory() is not implemented");
  }

  // Вовзвращает историю минутных баров за period секунд от текущего момента
  async getBarHistory(period) {
    throw new Error("getBarHistory() is not implemented");
  }

  // Вовзвращает историю в виде времени и цены за period секунд от текущего момента
  // Если биржа умеет возвращать историю сделок за достаточно большой период
  // и достаточно быстро, то используется она, иначе история минутных баров
  async getHistory(period) {
    throw new Error("getHistory() is not implemented");
  }
}

module.exports = Connector;
