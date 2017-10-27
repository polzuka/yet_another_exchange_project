'use strict';

const express = require('express');
const {
  getHistoryData,
  getUpdateData,
  getBoundaryData,
  getBooksData
} = require('../data/real');
const router = express.Router();

function getData (requestObject) {
  switch (requestObject.type) {
    case 'boundary': return getBoundaryData(requestObject.batchId);
    case 'history': return getHistoryData(requestObject.batchId, requestObject.limit, requestObject.firstLoadedId);
    case 'update': return getUpdateData(requestObject.batchId, requestObject.lastLoadedId);
    default: throw new Error(`Unknown type '${requestObject}'.`);
  }
}

router.get('/data', async (req, res) => {
  const books = await getBooksData(req.query.tradeId);
  res.send(books);
});

/* GET data. */
router.ws('/data', (ws, req) => {
  ws.on('message', async msg => {
    const requestObject = JSON.parse(msg);
    const data = await getData(requestObject);
    ws.send(JSON.stringify(data));
  });
});

module.exports = router;
