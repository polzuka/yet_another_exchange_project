 'use strict';

 process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

const connectors = require('./connectors');
const {CEX_KEY, CEX_SECRET} = require('./config');
const db = require('./db');

const batchId = Date.now();



async function onTrade(trade, connectorList) {
  const books = await Promise.all(connectorList.map(connector => connector.getBook()));
  // console.log(JSON.stringify(books));
  try {
  await db.trades.add(batchId, trade, books);
} catch(e) {
  console.log('!!!!', e, batchId, trade, books)
}

}

async function main() {
  const connectorList = await Promise.all([
    connectors.create('CEXIO', 'BTCUSD', CEX_KEY, CEX_SECRET, 10),
    connectors.create('BITFINEX', 'BTCUSD', CEX_KEY, CEX_SECRET, 10)
  ]);

  connectorList.forEach(connector => {
    connector.on('trade', trade => onTrade(trade, connectorList));
  });
}

main();


