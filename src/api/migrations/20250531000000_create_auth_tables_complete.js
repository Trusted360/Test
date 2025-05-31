/**
 * Create authentication tables with proper multi-tenant support from the start
 * This replaces the three separate migrations with one properly designed migration
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // First ensure users table has tenant_id if it doesn't already
    .hasColumn('users', 'tenant_id')
    .then(hasTenantId => {
      if (!hasTenantId) {
        return knex.schema.table('users', (table) => {
          table.string('tenant_id', 50).notNullable().defaultTo('default');
          table.index(['email', 'tenant_id']);
        });
      }
    })
    // Create sessions table with tenant_id from the start
    .then(() => {
      return knex.schema.createTable('sessions', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('token', 255).notNullable();
        table.string('token_hash', 255);
        table.string('device_info', 255);
        table.string('ip_address', 45);
        table.string('user_agent', 500);
        table.string('tenant_id', 50).notNullable().defaultTo('default');
        table.timestamp('expires_at').notNullable();
        table.boolean('is_active').defaultTo(true);
        table.timestamp('last_activity_at');
        table.timestamps(true, true);
        
        // All indexes created at once
        table.index('token');
        table.index(['user_id', 'is_active']);
        table.index(['user_id', 'tenant_id']);
      });
    })
    // Create user_activities table with tenant_id from the start
    .then(() => {
      return knex.schema.createTable('user_activities', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('activity_type', 50).notNullable();
        table.json('details');
        table.string('resource_type', 50);
        table.string('resource_id', 255);
        table.string('ip_address', 45);
        table.string('user_agent', 500);
        table.string('tenant_id', 50).notNullable().defaultTo('default');
        table.timestamps(true, true);
        
        // All indexes created at once
        table.index(['user_id', 'activity_type']);
        table.index(['user_id', 'tenant_id']);
      });
    })
    // Create password_reset_tokens table
    .then(() => {
      return knex.schema.createTable('password_reset_tokens', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('token', 255).notNullable().unique();
        table.timestamp('expires_at').notNullable();
        table.boolean('used').defaultTo(false);
        table.timestamps(true, true);
        
        table.index('token');
      });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('password_reset_tokens')
    .dropTableIfExists('user_activities')
    .dropTableIfExists('sessions')
    .then(() => {
      // Remove tenant_id from users table if we added it
      return knex.schema.hasColumn('users', 'tenant_id').then(hasTenantId => {
        if (hasTenantId) {
          return knex.schema.table('users', (table) => {
            table.dropIndex(['email', 'tenant_id']);
            table.dropColumn('tenant_id');
          });
        }
      });
    });
}; 