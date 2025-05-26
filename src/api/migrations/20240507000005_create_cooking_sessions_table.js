/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('cooking_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('recipe_id').notNullable().references('id').inTable('recipes').onDelete('CASCADE');
    table.uuid('member_id').notNullable().references('id').inTable('household_members').onDelete('CASCADE');
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.string('status').notNullable().defaultTo('active'); // active, completed, abandoned
    table.integer('current_step').notNullable().defaultTo(0);
    table.jsonb('messages').notNullable().defaultTo('[]');
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time');
    table.string('redis_key');
    table.jsonb('feedback').defaultTo('{}');
    table.integer('rating');
    table.string('tenant_id').notNullable();
    table.timestamps(true, true);

    // Add indexes for common queries
    table.index('member_id');
    table.index('household_id');
    table.index('recipe_id');
    table.index(['tenant_id', 'status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('cooking_sessions');
}; 