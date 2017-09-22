'use strict';

const express = require('express');
const {generateHistoryData, generateUpdateData} = require('../data/generate');
const router = express.Router();

function getData(requestObject) {
  switch (requestObject.type) {
    case 'history': return generateHistoryData();
    case 'update': return generateUpdateData(requestObject.nonce);
    default: throw new Error(`Unknown type '${type}'.`);
  }
}

/* GET data. */
router.ws('/data', (ws, req) => {
  ws.on('message', msg => {
    const requestObject = JSON.parse(msg);
    const data = getData(requestObject);
    ws.send(JSON.stringify(data));
  });
});

module.exports = router;
