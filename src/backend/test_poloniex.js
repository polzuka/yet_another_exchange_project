'use strict';

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
 // application specific logging, throwing an error, or other logic here
});

const connectors = require('./connectors');
const ConnectorLoggingContainer = require('./logger');
const {POLONIEX_KEY, POLONIEX_SECRET} = require('./config');

const logger = ConnectorLoggingContainer.add('index');

async function onTrade(trade, connector) {
 const book = await connector.getBook();
 logger.info('New trade %j', {trade, book});
}

async function main() {
 const connectorList = await Promise.all([
   connectors.create({mic: 'POLONIEX', pair: 'USDT_BTC', apiKey: POLONIEX_KEY, apiSecret: POLONIEX_SECRET, depth: 10}),
  //  connectors.create('BITFINEX', 'BTCUSD', CEX_KEY, CEX_SECRET, 10)
 ]);

 const [cex, ] = connectorList;
 connectorList.forEach(connector => {
   connector.on('trade', trade => onTrade(trade, cex));
 });
}

main();
