'use strict';

const db = require('../../backend/db');

function compareTradesByTs(a, b) {
  return a.trade.ts - b.trade.ts;
}

function getMics([mic1, mic2]) {
  const mics = {};

  if (mic1 > mic2)
    [mic1, mic2] = [mic2, mic1];

  mics[mic1] = 1;
  mics[mic2] = 2;
  return mics;
}

function getChartItem(trade, books) {
  const mics = getMics(books.books.map(book => book.mic));
  const i = mics[trade.mic];
  const chartItem = {
    date: new Date(trade.ts),
    volume: trade.amount,
    // bulletSize: trade.amount * 10,
    bulletSize: 7,
    bullet: trade.side === 'SELL' ? 'triangleDown' : 'triangleUp',
    books: books.books,
  };

  chartItem[`price${i}`] = trade.price;

  books.books.forEach(book => {
    const i = mics[book.mic];
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
    .map(({trade, books}) => getChartItem(trade, books));

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
    .map(({trade, books}) => getChartItem(trade, books));

  return {
    chartData,
    nonce,
    batchId
  };
}

module.exports = {
  getHistoryData,
  getUpdateData
};