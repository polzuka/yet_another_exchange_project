'use strict';

const db = require('../../backend/db');

const mics = {CEXIO: 1, BITFINEX: 2};

function getChartItem(trade) {
  const o = {};
  const i = mics[trade.mic];
  o[`price${i}`] = trade.price;
  o['date'] = new Date(trade.ts);
  o['volume'] = Math.abs(trade.amount);
  o['bulletSize'] = Math.abs(trade.amount);
  return o;
}

async function getHistoryData() {
  const batchId = await db.trades.getLastBatchId();
  const rows = await db.trades.getBatchTrades(batchId) || [];

  const chartData = rows.map(({trade, books, nonce}) => getChartItem(trade));

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

  const chartData = rows.map(({trade, books, nonce}) => getChartItem(trade));

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