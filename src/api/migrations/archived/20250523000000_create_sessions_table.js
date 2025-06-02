/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash').notNullable();
    table.string('device_info');
    table.string('ip_address');
    table.string('user_agent');
    table.string('tenant_id').notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_activity_at');
    table.timestamps(true, true);

    // Add row level security for multi-tenancy
    table.index(['user_id', 'tenant_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('sessions');
}; 