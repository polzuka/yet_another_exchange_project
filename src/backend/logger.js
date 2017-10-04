'use strict';

const winston = require('winston');

const originalAddLogger = winston.Container.prototype.add; // winston.loggers.get(loggerName);
winston.Container.prototype.add = function (loggerName, options)  {
    const logger = originalAddLogger.call(this, loggerName, options)
    logger.rewriters.push((level, msg, meta) => {
        meta._l = loggerName;
        return meta;
    });
    return logger;
}

const container = new winston.Container({
  transports: [
    new winston.transports.Console( {
      level: 'debug',
      colorize: true,
      prettyPrint: true,
      formatter: args => `[${args.meta._l}] <${new Date().toISOString()}> (${args.level}): ${args.message}`
    } ),
  ]
});

module.exports = container;