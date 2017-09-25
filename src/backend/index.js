 'use strict';

const connectors = require('./connectors');
const {CEX_KEY, CEX_SECRET} = require('./config');
const db = require('./db');

async function onTrade(trade, connectorList) {
  const books = await Promise.all(connectorList.map(connector => connector.getBook()));
  console.log(JSON.stringify(books));
  await db.trades.add(trade, books);
}

async function main() {
  const connectorList = await Promise.all([
    connectors.create('CEXIO', 'BTCUSD', CEX_KEY, CEX_SECRET, 10),
    connectors.create('BITFINEX', 'BTCUSD', CEX_KEY, CEX_SECRET, 10)
  ]);

  connectorList.forEach(connector => {
    connector.on('trade', trade => onTrade(trade, connectorList));
  });

  // const bitfinex = await connectors.create('BITFINEX', 'BTCUSD', CEX_KEY, CEX_SECRET, 10);
  // bitfinex.on('trade', trade => console.log('bitfinex', trade));

  // const cex = await connectors.create('CEX', 'BTCUSD', CEX_KEY, CEX_SECRET, 10);
  // cex.on('trade', trade => console.log('bitfinex', trade));
}

main();
