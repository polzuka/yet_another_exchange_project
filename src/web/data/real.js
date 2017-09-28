'use strict';

const db = require('../../backend/db');

const mics = {CEXIO: 1, BITFINEX: 2};

function getChartItem(trade, books) {
  const i = mics[trade.mic];
  const chartItem = {
    date: new Date(trade.ts),
    volume: Math.abs(trade.amount),
    bulletSize: Math.abs(trade.amount),
    books: books.books
  };

  chartItem[`price${i}`] = trade.price;

  return chartItem;
}

async function getHistoryData() {
  const batchId = await db.trades.getLastBatchId();
  const rows = await db.trades.getBatchTrades(batchId) || [];

  const chartData = rows.map(({trade, books, nonce}) => getChartItem(trade, books));

  const nonce = rows.length ? rows[rows.length - 1].nonce : 0;

  console.log({chartData});

  return {
    chartData,
    nonce,
    batchId
  };
}

async function getUpdateData(batchId, oldNonce) {
  const rows = await db.trades.getBatchTrades(batchId, oldNonce) || [];

  const chartData = rows.map(({trade, books, nonce}) => getChartItem(trade, books));

  const nonce = rows.length ? rows[rows.length - 1].nonce : oldNonce;

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