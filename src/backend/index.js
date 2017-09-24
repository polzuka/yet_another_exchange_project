 'use strict';

const connectors = require('./connectors');
const {CEX_KEY, CEX_SECRET} = require('./config');

async function main() {
  const [cex, bitfinex] = await Promise.all([
    connectors.create('CEX', 'BTCUSD', CEX_KEY, CEX_SECRET, 10),
    connectors.create('BITFINEX', 'BTCUSD', CEX_KEY, CEX_SECRET, 10)
  ])
  cex.on('trade', trade => console.log('cex', trade));
  bitfinex.on('trade', trade => console.log('bitfinex', trade));
  // const bitfinex = await connectors.create('BITFINEX', 'BTCUSD', CEX_KEY, CEX_SECRET, 10);
  // bitfinex.on('trade', trade => console.log('bitfinex', trade));
}

main();
