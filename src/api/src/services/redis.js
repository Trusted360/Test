const { createClient } = require('redis');
const config = require('../config');
const logger = require('../utils/logger');

// Create Redis client
const redisClient = createClient({
  url: config.redis.url
});

// Handle Redis errors
redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

// Log when Redis connects
redisClient.on('connect', () => {
  logger.info('Redis connected');
});

// Log when Redis reconnects
redisClient.on('reconnecting', () => {
  logger.info('Redis reconnecting');
});

// Log when Redis is ready
redisClient.on('ready', () => {
  logger.info('Redis ready');
});

/**
 * Setup Redis connection
 */
async function setupRedis() {
  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
}

/**
 * Close Redis connection
 */
async function closeRedis() {
  try {
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
}

/**
 * Set a value in Redis with optional expiration
 */
async function set(key, value, expireSeconds = null) {
  try {
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    if (expireSeconds) {
      await redisClient.set(key, serializedValue, { EX: expireSeconds });
    } else {
      await redisClient.set(key, serializedValue);
    }
    
    return true;
  } catch (error) {
    logger.error(`Redis set error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Get a value from Redis
 */
async function get(key, parseJson = true) {
  try {
    const value = await redisClient.get(key);
    
    if (value === null) {
      return null;
    }
    
    if (parseJson) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    
    return value;
  } catch (error) {
    logger.error(`Redis get error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Delete a key from Redis
 */
async function del(key) {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Redis del error for key ${key}:`, error);
    throw error;
  }
}

module.exports = {
  redisClient,
  setupRedis,
  closeRedis,
  set,
  get,
  del
};
