/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('user_activities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('tenant_id').notNullable();
    table.string('activity_type').notNullable();
    table.string('resource_type');
    table.string('resource_id');
    table.jsonb('details').defaultTo('{}');
    table.string('ip_address');
    table.string('user_agent');
    table.timestamps(true, true);

    // Add row level security for multi-tenancy
    table.index(['user_id', 'tenant_id']);
    table.index(['activity_type', 'tenant_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('user_activities');
}; 