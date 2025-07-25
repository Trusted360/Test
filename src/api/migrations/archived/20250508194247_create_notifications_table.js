/**
 * Migration: Create notifications table
 * Generated by simmer schema utility
 */
exports.up = function(knex) {
  return knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary();
    table.string('type', 50).notNullable();
    table.string('title', 200).notNullable();
    table.text('body').notNullable();
    table.jsonb('data');
    table.string('status', 20).notNullable().defaultTo('pending');
    table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('scheduled_for', { useTz: false });
    table.timestamp('expires_at', { useTz: false });
    table.string('priority', 10).notNullable().defaultTo('medium');
    table.uuid('tenant_id').notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notifications');
};
