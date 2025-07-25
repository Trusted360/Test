/**
 * Migration: Create password_reset table
 * Generated by simmer schema utility
 */
exports.up = function(knex) {
  return knex.schema.createTable('password_reset', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.string('token', 255).notNullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('tenant_id');
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('tenant_id').references('id').inTable('tenants');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('password_reset');
};
