 'use strict';

const connectors = require('./connectors');
const {CEX_KEY, CEX_SECRET} = require('./config');

async function main() {
  const cex = await connectors.create('CEX', 'BTCUSD', CEX_KEY, CEX_SECRET, 10);
  cex.on('trade', trade => console.log(trade));
}

main();
