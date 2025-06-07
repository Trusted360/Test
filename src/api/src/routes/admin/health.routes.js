const express = require('express');
const { knex: db } = require('../../database');
const { redisClient } = require('../../services/redis');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * Get system health metrics
 * GET /admin/health
 */
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const healthMetrics = {
      database: await getDatabaseHealth(),
      api: getApiHealth(),
      redis: await getRedisHealth(),
      system: getSystemHealth()
    };

    // Log health check
    logger.info(`Health check performed by user ${req.user.id}`);

    res.json(healthMetrics);

  } catch (error) {
    logger.error(`Health check error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health metrics'
    });
  }
});

/**
 * Get database health metrics
 */
async function getDatabaseHealth() {
  const startTime = Date.now();
  
  try {
    // Test database connection with a simple query
    await db.raw('SELECT 1');
    const responseTime = Date.now() - startTime;

    // Get connection pool info if available
    let connectionCount = 0;
    try {
      const poolInfo = db.client.pool;
      connectionCount = poolInfo ? (poolInfo.numUsed() + poolInfo.numFree()) : 1;
    } catch (poolError) {
      // If pool info not available, default to 1
      connectionCount = 1;
    }

    return {
      status: responseTime < 1000 ? 'healthy' : (responseTime < 5000 ? 'warning' : 'error'),
      connectionCount,
      responseTime,
      lastChecked: new Date()
    };

  } catch (error) {
    logger.error(`Database health check failed: ${error.message}`);
    return {
      status: 'error',
      connectionCount: 0,
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      error: error.message
    };
  }
}

/**
 * Get API health metrics
 */
function getApiHealth() {
  const uptime = process.uptime();
  
  // Simple response time check (this is the current request)
  const responseTime = 1; // Placeholder since we can't measure our own response time
  
  return {
    status: 'healthy', // If we're responding, we're healthy
    uptime,
    responseTime,
    lastChecked: new Date()
  };
}

/**
 * Get Redis health metrics
 */
async function getRedisHealth() {
  try {
    const startTime = Date.now();
    
    // Test Redis connection
    if (!redisClient) {
      return {
        status: 'error',
        memoryUsage: 0,
        connectedClients: 0,
        lastChecked: new Date(),
        error: 'Redis client not available'
      };
    }

    // Ping Redis
    await redisClient.ping();
    const responseTime = Date.now() - startTime;

    // Get Redis info
    let memoryUsage = 0;
    let connectedClients = 0;

    try {
      const info = await redisClient.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      if (memoryMatch) {
        memoryUsage = parseInt(memoryMatch[1]);
      }

      const clientsInfo = await redisClient.info('clients');
      const clientsMatch = clientsInfo.match(/connected_clients:(\d+)/);
      if (clientsMatch) {
        connectedClients = parseInt(clientsMatch[1]);
      }
    } catch (infoError) {
      // If we can't get detailed info, that's okay
      logger.warn(`Could not get Redis info: ${infoError.message}`);
    }

    return {
      status: responseTime < 100 ? 'healthy' : (responseTime < 500 ? 'warning' : 'error'),
      memoryUsage,
      connectedClients,
      lastChecked: new Date()
    };

  } catch (error) {
    logger.error(`Redis health check failed: ${error.message}`);
    return {
      status: 'error',
      memoryUsage: 0,
      connectedClients: 0,
      lastChecked: new Date(),
      error: error.message
    };
  }
}

/**
 * Get system health metrics
 */
function getSystemHealth() {
  const memoryUsage = process.memoryUsage();
  
  return {
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    memoryUsage: {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    },
    lastChecked: new Date()
  };
}

/**
 * Get detailed database statistics
 * GET /admin/health/database
 */
router.get('/database', async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    res.json(stats);
  } catch (error) {
    logger.error(`Database stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database statistics'
    });
  }
});

/**
 * Get detailed database statistics
 */
async function getDatabaseStats() {
  try {
    // Get table sizes and row counts
    const tableStats = await db.raw(`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public'
      ORDER BY tablename, attname
    `);

    // Get database size
    const dbSize = await db.raw(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);

    return {
      tableStats: tableStats.rows || [],
      databaseSize: dbSize.rows?.[0]?.size || 'Unknown',
      lastChecked: new Date()
    };

  } catch (error) {
    logger.error(`Database stats query failed: ${error.message}`);
    throw error;
  }
}

module.exports = router;
