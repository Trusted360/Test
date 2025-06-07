/**
 * Baseline migration representing the actual current state of the database
 * This should be the FIRST migration, replacing all conflicting ones
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // NOTE: This migration documents the existing state
  // The tables already exist, so this won't be run
  // It's here for documentation and consistency
  
  return Promise.resolve()
    .then(() => {
      // Users table - as it actually exists
      return knex.schema.hasTable('users').then(exists => {
        if (!exists) {
          return knex.schema.createTable('users', (table) => {
            table.increments('id').primary();
            table.string('email', 255).notNullable().unique();
            table.string('password', 255).notNullable();
            table.string('first_name', 255);
            table.string('last_name', 255);
            table.string('role', 50).defaultTo('user');
            table.string('admin_level', 20).defaultTo('none');
            table.boolean('email_verified').defaultTo(false);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            
            table.index(['email', 'tenant_id']);
          });
        }
      });
    })
    .then(() => {
      // Sessions table - as created by our fix
      return knex.schema.hasTable('sessions').then(exists => {
        if (!exists) {
          return knex.schema.createTable('sessions', (table) => {
            table.increments('id').primary();
            table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('token', 255).notNullable();
            table.string('token_hash', 255);
            table.string('device_info', 255);
            table.string('ip_address', 45);
            table.string('user_agent', 500);
            table.timestamp('expires_at').notNullable();
            table.boolean('is_active').defaultTo(true);
            table.timestamp('last_activity_at');
            table.timestamps(true, true);
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            
            table.index('token');
            table.index(['user_id', 'is_active']);
            table.index(['user_id', 'tenant_id']);
          });
        }
      });
    })
    .then(() => {
      // User activities table - as created by our fix
      return knex.schema.hasTable('user_activities').then(exists => {
        if (!exists) {
          return knex.schema.createTable('user_activities', (table) => {
            table.increments('id').primary();
            table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('activity_type', 50).notNullable();
            table.json('details');
            table.string('resource_type', 50);
            table.string('resource_id', 255);
            table.string('ip_address', 45);
            table.string('user_agent', 500);
            table.timestamps(true, true);
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            
            table.index(['user_id', 'activity_type']);
            table.index(['user_id', 'tenant_id']);
          });
        }
      });
    })
    .then(() => {
      // Password reset tokens table - as created by our fix
      return knex.schema.hasTable('password_reset_tokens').then(exists => {
        if (!exists) {
          return knex.schema.createTable('password_reset_tokens', (table) => {
            table.increments('id').primary();
            table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('token', 255).notNullable().unique();
            table.timestamp('expires_at').notNullable();
            table.boolean('used').defaultTo(false);
            table.timestamps(true, true);
            
            table.index('token');
          });
        }
      });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Don't drop tables in baseline migration
  return Promise.resolve();
};
