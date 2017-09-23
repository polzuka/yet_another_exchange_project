'use strict';

const CexConnector = require('./cex_connector');


class Connectors {

  getConstructor(type) {
    switch (type) {
      case 'CEX': return CexConnector;
      default: throw new Error(`Unknown connector type '${type}'`);
    }
  }

  create(type, pair, apiKey, apiSecret, depth) {
    const connectorConstructor = this.getConstructor(type);
    const connector = new connectorConstructor(pair, apiKey, apiSecret, depth);
    return new Promise(resolve => {
      const onSynced = () => {
        connector.removeListener('synced', onSynced);
        return resolve(connector);
      }
      connector.on('synced', onSynced);
      connector.init();
    });
  }
}

module.exports = new Connectors();