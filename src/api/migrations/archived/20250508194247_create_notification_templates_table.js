/**
 * Migration: Create notification_templates table
 * Generated by simmer schema utility
 */
exports.up = function(knex) {
  return knex.schema.createTable('notification_templates', (table) => {
    table.uuid('id').primary();
    table.string('name', 100).notNullable();
    table.string('type', 50).notNullable();
    table.text('title_template').notNullable();
    table.text('body_template').notNullable();
    table.jsonb('data_schema');
    table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(knex.fn.now());
    table.uuid('tenant_id').notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notification_templates');
};
