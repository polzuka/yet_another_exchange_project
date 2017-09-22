'use strict';

const winston = require('winston');

const container = new winston.Container({
    transports: [
      new winston.transports.Console( {
        level: 'debug', // Only write logs of warn level or higher
        colorize: true
      } ),
    ]
  });


module.exports = container;