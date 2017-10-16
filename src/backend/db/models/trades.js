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

    getBatchTrades: (batchId, nonce = 0) => model.manyOrNone(
      'SELECT trade, books, id AS nonce FROM trades WHERE batch_id = $1 AND id > $2 ORDER BY id',
      [batchId, nonce]
    ),

    getBatches: () => model.manyOrNone(
      'SELECT batch_id FROM trades GROUP BY batch_id ORDER BY batch_id DESC'
    ).then(rows => {
      return rows ? rows.map(row => row.batch_id) : [];
    })
  };
};
