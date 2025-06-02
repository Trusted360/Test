/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('sessions', (table) => {
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
      
      table.index('token');
      table.index(['user_id', 'is_active']);
    })
    .createTable('user_activities', (table) => {
      table.increments('id').primary();
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('activity_type', 50).notNullable();
      table.json('details');
      table.string('resource_type', 50);
      table.string('resource_id', 255);
      table.string('ip_address', 45);
      table.string('user_agent', 500);
      table.timestamps(true, true);
      
      table.index(['user_id', 'activity_type']);
    })
    .createTable('password_reset_tokens', (table) => {
      table.increments('id').primary();
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('token', 255).notNullable().unique();
      table.timestamp('expires_at').notNullable();
      table.boolean('used').defaultTo(false);
      table.timestamps(true, true);
      
      table.index('token');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTable('password_reset_tokens')
    .dropTable('user_activities') 
    .dropTable('sessions');
}; 