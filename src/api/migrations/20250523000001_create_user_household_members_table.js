/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('user_household_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('household_member_id').notNullable().references('id').inTable('household_members').onDelete('CASCADE');
    table.string('tenant_id').notNullable();
    table.timestamps(true, true);

    // Add unique constraint to prevent duplicate relationships
    table.unique(['user_id', 'household_member_id', 'tenant_id']);
    
    // Add row level security for multi-tenancy
    table.index(['user_id', 'tenant_id']);
    table.index(['household_member_id', 'tenant_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('user_household_members');
}; 