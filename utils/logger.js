// logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create log directory if it doesn't exist
const logDir = 'log';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: path.join(logDir, `log-${Date.now()}.log`),
            options: { flags: 'w' }
        })
    ]
});

module.exports = logger;
