'use strict';

const EventEmitter = require('events');

class Connector extends EventEmitter {
  constructor(pair, apiKey, apiSecret, depth) {
    super();
    this.pair = pair;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.depth = depth;
  }

  
}

module.exports = Connector;