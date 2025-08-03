const winston = require('winston');
const config = require('../config');
const fs = require('fs');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance with console transport by default
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'trusted360-api' },
  transports: [
    // Always log to console (especially important for containerized environments)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Try to add file transports if logs directory exists or can be created
try {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Add file transports only if directory creation succeeded
  logger.add(new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }));
  logger.add(new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }));
} catch (error) {
  // If we can't create log files (e.g., in read-only container), just use console
  console.warn('Could not create log files, using console output only:', error.message);
}

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;
