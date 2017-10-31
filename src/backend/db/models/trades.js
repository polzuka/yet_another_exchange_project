'use strict';

module.exports = (model, pgp) => {
  return {
    add: (batchId, trade, books) => {
      return model.none(
        `INSERT INTO trades
        (batch_id, mic, pair, trade, books, dt)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          batchId,
          trade.mic,
          trade.pair,
          trade,
          {books},
          new Date(trade.ts)
        ]
      );
    },

    getLastBatchId: () => model.oneOrNone(
      'SELECT batch_id FROM trades GROUP BY batch_id ORDER BY batch_id DESC LIMIT 1'
    ).then(row => {
      return row ? row.batch_id : null;
    }),

    getBatchTradesUpdates: (batchId, lastLoadedId = 0) => model.manyOrNone(
      'SELECT trade, books, id FROM trades WHERE batch_id = $1 AND id > $2 ORDER BY id',
      [batchId, lastLoadedId]
    ),

    getBatchTradesHistory: (batchId, limit, firstLoadedId) => {
      return model.manyOrNone('SELECT trade, books, id FROM trades WHERE batch_id = $1 AND id < $2 ORDER BY id DESC LIMIT $3', [batchId, firstLoadedId, limit]);
    },

    getBatches: () => model.manyOrNone(
      'SELECT batch_id FROM trades GROUP BY batch_id ORDER BY batch_id DESC'
    ).then(rows => {
      return rows ? rows.map(row => row.batch_id) : [];
    }),

    getBatchFirstTrade: batchId => model.oneOrNone(
      'SELECT trade, books, id FROM trades WHERE batch_id = $1 ORDER BY id LIMIT 1',
      [batchId]
    ),

    getBatchLastTrade: batchId => model.oneOrNone(
      'SELECT trade, books, id FROM trades WHERE batch_id = $1 ORDER BY id DESC LIMIT 1',
      [batchId]
    ),

    getBooks: tradeId => {
      return model.oneOrNone(
        'SELECT books FROM trades WHERE id = $1',
        [tradeId]
      ).then(row => row.books);
    }
  };
};
