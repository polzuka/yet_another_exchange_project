'use strict';

const EventEmitter = require('events');

class Connector extends EventEmitter {
  constructor(pair, apiKey, apiSecret, depth) {
    super();
    this.pair = [pair.substr(0, 3), pair.substr(3)];
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.depth = depth;
  }

  
}

module.exports = Connector;