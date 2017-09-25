'use strict';

module.exports = (model, pgp) => {
  return {
    add: (trade, books) => model.none(
        `INSERT INTO trades
        (mic, pair, trade, books)
        VALUES ($1, $2, $3, $4)`,
        [
          trade.mic,
          trade.pair,
          trade,
          {books}
        ]
      )
  };
};
