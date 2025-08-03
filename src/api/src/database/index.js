const knex = require('knex');
const { Model } = require('objection');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize knex instance
const knexInstance = knex({
  client: 'pg',
  connection: config.database.url,
  pool: config.database.pool,
  debug: false,
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
    
    // Run migrations if not explicitly disabled
    if (process.env.SKIP_MIGRATIONS !== 'true') {
      logger.info('Running cleanup migration...');
      await knexInstance('knex_migrations')
        .whereIn('name', [
          '20250731000000_create_sop_management_system.js',
          '20250802000001_create_sop_tables.js',
          '20250803000000_replace_sop_with_simple_tables.js',
          '20250805000000_nuclear_sop_cleanup.js'
        ])
        .delete();
      logger.info('Cleanup migration completed');

      logger.info('Running migrations...');
      await knexInstance.migrate.latest();
      logger.info('Migrations completed');
    } else {
      logger.info('Migrations skipped (SKIP_MIGRATIONS=true)');
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
