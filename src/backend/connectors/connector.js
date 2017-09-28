'use strict';

const EventEmitter = require('events');
const ConnectorLoggingContainer = require('../logger');

const logger = ConnectorLoggingContainer.add('connector');


class Connector extends EventEmitter {
  constructor(pair, apiKey, apiSecret, depth) {
    super();

    if (this.constructor.mic === undefined)
      throw new Error('!!!!!');

    this.pair = pair, 
    this.splittedPair = [pair.substr(0, 3), pair.substr(3)];
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.depth = depth;

    // Стакан
    this.book = {
      buySide: null,
      sellSide: null,
      dt: null
    };
  }

  __showBook() {
    const asks = this.book.sellSide.entries().map(([price, amount]) => `${price} = ${amount}`);
    const maxAsksLength = asks.map(ask => ask.length).slice(0, this.depth).sort((a, b) => a - b)[this.depth - 1];
    const bids = this.book.buySide.entries().map(([price, amount]) => `${price} = ${amount}`);
    // logger.info(JSON.stringify(asks));
    let s = `\nASKS${' '.repeat(maxAsksLength)}BIDS\n`;
    for (let i = 0; i < this.depth; i++)
      s += asks[i] + ' '.repeat(maxAsksLength - (asks[i] || '').length + 4) + bids[i] + '\n';
    logger.debug(s);
  }

  __normalizeBookInfo(book) {
    return {
      buySide: book.buySide.toJSON().slice(0, this.depth),
      sellSide: book.sellSide.toJSON().slice(0, this.depth),
      ts: book.ts,
      pair: this.pair,
      mic: this.constructor.mic
    }
  }
}

module.exports = Connector;