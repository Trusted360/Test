/**
 * Migration to enable PostgreSQL extensions
 * This must run first before any table creation
 */
exports.up = async (knex) => {
  // Enable UUID functions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  
  // Enable pgcrypto for gen_random_uuid()
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
};

exports.down = async (knex) => {
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
  await knex.raw('DROP EXTENSION IF EXISTS "pgcrypto"');
}; 