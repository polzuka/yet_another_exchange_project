 'use strict';

 process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});


const connectors = require('./connectors');
const ConnectorLoggingContainer = require('./logger');
const {CEX_KEY, CEX_SECRET} = require('./config');
const db = require('./db');

const logger = ConnectorLoggingContainer.add('index');
const batchId = Date.now();

async function onTrade(trade, connectorList) {
  const books = await Promise.all(connectorList.map(connector => connector.getBook()));
  await db.trades.add(batchId, trade, books);
  logger.info('New trade %j', {trade, books});
}

async function main() {
  const connectorList = await Promise.all([
    // connectors.create({mic: 'CEXIO', pair: 'BTC-USD', apiKey: CEX_KEY, apiSecret: CEX_SECRET, depth: 10}),
    // connectors.create({mic: 'CEXIO', pair: 'BTC-USD', apiKey: CEX_KEY, apiSecret: CEX_SECRET, depth: 10})
    connectors.create({mic: 'BITTREX', pair: 'USDT-BTC', apiKey: '', apiSecret: '', depth: 10}),
   connectors.create({mic: 'BITFINEX', pair: 'BTC-USD', apiKey: '', apiSecret: '', depth: 10})
  ]);

  connectorList.forEach(connector => {
    connector.on('trade', trade => onTrade(trade, connectorList));
  });
}

main();


