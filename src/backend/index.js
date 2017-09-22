 'use strict';

const CexConnector = require('./connectors/cex_connector');
const {CEX_KEY, CEX_SECRET} = require('./config');


const cex = new CexConnector('btc_usd', CEX_KEY, CEX_SECRET, 10);
