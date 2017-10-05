'use strict';

const express = require('express');
const {getHistoryData, getUpdateData} = require('../data/real');
const router = express.Router();

async function getData(requestObject) {
  switch (requestObject.type) {
    case 'history': return await getHistoryData(requestObject.batchId);
    case 'update': return await getUpdateData(requestObject.batchId, requestObject.nonce);
    default: throw new Error(`Unknown type '${requestObject}'.`);
  }
}

/* GET data. */
router.ws('/data', (ws, req) => {
  ws.on('message', async msg => {
    const requestObject = JSON.parse(msg);
    const data = await getData(requestObject);
    ws.send(JSON.stringify(data));
  });
});

module.exports = router;
