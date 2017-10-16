'use strict';

const connectors = [
  require('./cex'),
  require('./bitfinex'),
  require('./bittrex'),
  require('./kraken'),
  require('./bitmex'),
  require('./poloniex')
].reduce((connectors, connector) => {
  connectors[connector.mic] = connector;
  return connectors;
}, {});

const ConnectorLoggingContainer = require('../logger');

const logger = ConnectorLoggingContainer.add('connectors');


class Connectors {

  __getConstructor(mic) {
    const connector = connectors[mic];
    if (!connector)
      throw new Error(`Unknown connector mic '${mic}'`);
    return connector;
  }

  create({mic, pair, apiKey, apiSecret, depth}) {
    const connectorConstructor = this.__getConstructor(mic);
    const connector = new connectorConstructor(pair, apiKey, apiSecret, depth);
    return new Promise(resolve => {
      connector.once('synchronized', () => {
        logger.info(`Connector ${connector.constructor.mic} is connected.`);
        resolve(connector);
      });
      connector.init();
    });
  }
}

module.exports = new Connectors();
