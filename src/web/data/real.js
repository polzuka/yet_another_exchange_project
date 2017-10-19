'use strict';

const db = require('../../backend/db');
const offset = new Date().getTimezoneOffset();

function compareTradesByTs(a, b) {
  return a.trade.ts - b.trade.ts;
}

function getKeys(books) {
  let [key1, key2] = books.map(book => getKey(book));
  const keys = {};

  if (key1 < key2)
    [key1, key2] = [key2, key1];

  keys[key1] = 1;
  keys[key2] = 2;
  return keys;
}

function getKey({mic, pair}) {
  return mic + pair;
}

function getChartItem(tradeId, trade, books) {
  const keys = getKeys(books.books);
  const i = keys[getKey(trade)];

  const chartItem = {
    date: new Date(trade.ts + offset * 60000),
    volume: trade.amount,
    // bulletSize: trade.amount * 10,
    bulletSize: 7,
    bullet: trade.side === 'SELL' ? 'triangleDown' : 'triangleUp',
    tradeId
  };

  chartItem[`price${i}`] = trade.price;

  books.books.forEach(book => {
    const i = keys[getKey(book)];
    if (book.sellSide.length)
      chartItem[`sell${i}`] = book.sellSide[0][0];

    if (book.buySide.length)
      chartItem[`buy${i}`] = book.buySide[0][0];
  });

  return chartItem;
}

async function getHistoryData(batchId) {
  if (batchId === undefined)
    batchId = await db.trades.getLastBatchId();

  const rows = await db.trades.getBatchTrades(batchId) || [];

  const nonce = rows.length
    ? rows[rows.length - 1].nonce
    : 0;

  const chartData = rows
    .sort(compareTradesByTs)
    .map(({nonce, trade, books}) => getChartItem(nonce, trade, books));

  return {
    chartData,
    nonce,
    batchId
  };
}

async function getUpdateData(batchId, oldNonce) {
  const rows = await db.trades.getBatchTrades(batchId, oldNonce) || [];

  const nonce = rows.length
    ? rows[rows.length - 1].nonce
    : oldNonce;

  const chartData = rows
    .sort(compareTradesByTs)
    .map(({nonce, trade, books}) => getChartItem(nonce, trade, books));

  return {
    chartData,
    nonce,
    batchId
  };
}

async function getBooksData(tradeId) {
  const books = await db.trades.getBooks(tradeId);
  return books;
}

module.exports = {
  getHistoryData,
  getUpdateData,
  getBooksData
};