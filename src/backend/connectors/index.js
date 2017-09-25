'use strict';

const CexConnector = require('./cex');
const BitfinexConnector = require('./bitfinex');

class Connectors {

  __getConstructor(mic) {
    switch (mic) {
      case 'CEXIO': return CexConnector;
      case 'BITFINEX': return BitfinexConnector;
      default: throw new Error(`Unknown connector mic '${mic}'`);
    }
  }

  create(mic, pair, apiKey, apiSecret, depth) {
    const connectorConstructor = this.__getConstructor(mic);
    const connector = new connectorConstructor(pair, apiKey, apiSecret, depth);
    return new Promise(resolve => {      
      connector.once('synchronized', () => resolve(connector));
      connector.init();
    });
  }
}

module.exports = new Connectors();