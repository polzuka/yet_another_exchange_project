'use strict';

const winston = require('winston');

const container = new winston.Container({
    transports: [
      new winston.transports.Console( {
        level: 'info',
        colorize: true
      } ),
    ]
  });


module.exports = container;