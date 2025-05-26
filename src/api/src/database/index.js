const knex = require('knex');
const { Model } = require('objection');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize knex instance
const knexInstance = knex({
  client: 'pg',
  connection: config.database.url,
  pool: config.database.pool,
  debug: config.nodeEnv === 'development',
  asyncStackTraces: config.nodeEnv === 'development'
});

// Bind all Models to the knex instance
Model.knex(knexInstance);

/**
 * Setup database connection and run migrations if needed
 */
async function setupDatabase() {
  try {
    // Test the connection
    await knexInstance.raw('SELECT 1');
    logger.info('Database connection established successfully');
    
    // Run migrations in development or test mode
    if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
      logger.info('Running migrations...');
      await knexInstance.migrate.latest();
      logger.info('Migrations completed');
    }
    
    return knexInstance;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  try {
    await knexInstance.destroy();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
}

module.exports = {
  knex: knexInstance,
  setupDatabase,
  closeDatabase
};
