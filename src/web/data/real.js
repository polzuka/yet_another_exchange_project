'use strict';

const db = require('../../backend/db');
const offset = new Date().getTimezoneOffset();

function compareTradesByTs (a, b) {
  return a.trade.ts - b.trade.ts;
}

function getKeys (books) {
  let [key1, key2] = books.map(book => getKey(book));
  const keys = {};

  if (key1 < key2)
    [key1, key2] = [key2, key1];

  keys[key1] = 1;
  keys[key2] = 2;
  return keys;
}

function getKey ({mic, pair}) {
  return mic + pair;
}

function getChartItem ({id, trade, books}) {
  const keys = getKeys(books.books);
  const i = keys[getKey(trade)];

  const chartItem = {
    date: new Date(trade.ts + offset * 60000),
    volume: trade.amount,
    // bulletSize: trade.amount * 10,
    bulletSize: 7,
    bullet: trade.side === 'SELL' ? 'triangleDown' : 'triangleUp',
    tradeId: id
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

function getFirstChartItem ({id, trade, books}) {
  const keys = getKeys(books.books);
  const i = keys[getKey(trade)];

  const chartItem = {
    date: new Date(trade.ts + offset * 60000),
    volume: trade.amount,
    tradeId: id
  };

  chartItem[`firstPrice${i}`] = trade.price;
  return chartItem;
}

async function getHistoryData (batchId, limit, oldFirstLoadedId, requestedFirstDate) {
  const rows = await db.trades.getBatchTradesHistory(batchId, limit, oldFirstLoadedId) || [];

  if (rows.length === 0)
    return {
      type: 'history',
      chartData: [],
      firstLoadedId: oldFirstLoadedId,
      requestedFirstDate,
      complete: true
    };


  const firstLoadedId = rows[rows.length - 1].id;

  const chartData = rows
    .sort(compareTradesByTs)
    .map(trade => getChartItem(trade));

  if (!requestedFirstDate)
    return {
      type: 'history',
      chartData,
      firstLoadedId,
      requestedFirstDate,
      complete: true
    };

  if (chartData[0].date > requestedFirstDate)
    return {
      type: 'history',
      chartData,
      firstLoadedId,
      requestedFirstDate,
      complete: false
    };

  const index = chartData.findIndex(item => item.date >= requestedFirstDate);
  const truncatedChartData = chartData.slice(index);

  return {
    type: 'history',
    chartData: truncatedChartData,
    firstLoadedId: Math.min(...truncatedChartData.map(item => item.tradeId)),
    requestedFirstDate,
    complete: true
  };
}

async function getBoundaryData (batchId) {
  if (batchId === undefined)
    batchId = await db.trades.getLastBatchId();

  const [batchFirstTrade, batchLastTrade] = await Promise.all([
    await db.trades.getBatchFirstTrade(batchId),
    await db.trades.getBatchLastTrade(batchId)
  ]);

  const chartData = [];
  if (batchFirstTrade)
    chartData.push(getFirstChartItem(batchFirstTrade));

  if (batchLastTrade.id !== batchFirstTrade.id)
    chartData.push(getChartItem(batchLastTrade));

  const lastLoadedId = batchFirstTrade
    ? chartData[chartData.length - 1].tradeId
    : undefined;

  return {
    type: 'boundary',
    chartData,
    batchId,
    lastLoadedId
  };
}

async function getUpdateData (batchId, oldLastLoadedId) {
  const rows = await db.trades.getBatchTradesUpdates(batchId, oldLastLoadedId) || [];

  const lastLoadedId = rows.length
    ? rows[rows.length - 1].id
    : oldLastLoadedId;

  const chartData = rows
    .sort(compareTradesByTs)
    .map(({id, trade, books}) => getChartItem(id, trade, books));

  return {
    type: 'update',
    chartData,
    lastLoadedId,
    batchId
  };
}

async function getBooksData (tradeId) {
  const books = await db.trades.getBooks(tradeId);
  return books;
}

module.exports = {
  getBoundaryData,
  getHistoryData,
  getUpdateData,
  getBooksData
};
