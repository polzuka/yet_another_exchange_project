'use strict';

const rawConfig = require('./config.json');

const resultConfig = Object.keys(rawConfig)
  .reduce((config, key) => {
    config[key] = rawConfig[key] || process.env[key];
    return config;
  }, {});

module.exports = resultConfig;
