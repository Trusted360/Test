/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Create household_groups table
    .createTable('household_groups', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
      table.string('name', 100).notNullable();
      table.text('description');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.uuid('tenant_id').notNullable();
      table.unique(['household_id', 'name', 'tenant_id']);
      
      // Create indexes for performance
      table.index('household_id');
      table.index('tenant_id');
    })
    
    // Create household_group_members table
    .createTable('household_group_members', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('group_id').notNullable().references('id').inTable('household_groups').onDelete('CASCADE');
      table.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE');
      table.boolean('is_primary').notNullable().defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.uuid('tenant_id').notNullable();
      table.unique(['group_id', 'member_id', 'tenant_id']);
      
      // Create indexes for performance
      table.index('group_id');
      table.index('member_id');
      table.index('tenant_id');
    })
    
    // Create meal_plan_groups table
    .createTable('meal_plan_groups', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('meal_plan_id').notNullable().references('id').inTable('meal_plans').onDelete('CASCADE');
      table.uuid('group_id').notNullable().references('id').inTable('household_groups').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.uuid('tenant_id').notNullable();
      table.unique(['meal_plan_id', 'group_id', 'tenant_id']);
      
      // Create indexes for performance
      table.index('meal_plan_id');
      table.index('group_id');
      table.index('tenant_id');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('meal_plan_groups')
    .dropTableIfExists('household_group_members')
    .dropTableIfExists('household_groups');
}; 