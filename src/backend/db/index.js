'use strict';

const models = {
  trades: require('./models/trades')
}

const options = {
  extend: (obj, dc) => {
    for (let r in models) {
      obj[r] = models[r](obj, dc);
    }
  }
};

const pgp = require('pg-promise')(options);
const config = require('../config');

const dbConfig = {
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD
};

const db = pgp(dbConfig);
module.exports = db;