/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.string('first_name');
    table.string('last_name');
    table.string('tenant_id').notNullable();
    table.enum('role', ['user', 'admin', 'household_admin']).defaultTo('user');
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token');
    table.timestamp('email_verification_token_expires_at');
    table.string('reset_token');
    table.timestamp('reset_token_expires_at');
    table.boolean('two_factor_enabled').defaultTo(false);
    table.string('two_factor_secret');
    table.jsonb('preferences').defaultTo('{}');
    table.string('last_login_ip');
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('lock_until');
    table.timestamp('last_login_at');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('users');
}; 