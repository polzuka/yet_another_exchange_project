 'use strict';

 process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});


const connectors = require('./connectors');
const ConnectorLoggingContainer = require('./logger');
const markets = require('./markets.json');
const db = require('./db');

const logger = ConnectorLoggingContainer.add('index');
const batchId = Date.now();

async function onTrade(trade, connectorList) {
  const books = await Promise.all(connectorList.map(connector => connector.getBook()));
  await db.trades.add(batchId, trade, books);
  logger.info('New trade %j', {trade, books});
}

async function main() {
  const connectorList = await Promise.all(
    markets.map(market => connectors.create(market))
  );

  connectorList.forEach(connector => {
    connector.on('trade', trade => onTrade(trade, connectorList));
  });
}

main();


