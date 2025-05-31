/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .table('sessions', (table) => {
      table.string('tenant_id', 50).notNullable().defaultTo('default');
      table.index(['user_id', 'tenant_id']);
    })
    .table('user_activities', (table) => {
      table.string('tenant_id', 50).notNullable().defaultTo('default');
      table.index(['user_id', 'tenant_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .table('sessions', (table) => {
      table.dropIndex(['user_id', 'tenant_id']);
      table.dropColumn('tenant_id');
    })
    .table('user_activities', (table) => {
      table.dropIndex(['user_id', 'tenant_id']);
      table.dropColumn('tenant_id');
    });
}; 