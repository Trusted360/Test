/**
 * Migration template for Trusted360
 * 
 * Copy this file to create a new migration with best practices.
 * Filename should use timestamp format: YYYYMMDDnnnnnn_descriptive_name.js
 * Example: 20250610000000_create_facilities_table.js
 *
 * This template uses best practices:
 * - Integer primary keys
 * - tenant_id for multi-tenancy
 * - Proper timestamp fields
 * - Consistent indexing
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('table_name', (table) => {
    // PRIMARY KEY
    table.increments('id').primary();  // Integer primary key
    
    // REQUIRED COLUMNS
    table.string('name').notNullable();
    table.string('description');
    table.string('tenant_id', 50).notNullable().defaultTo('default');
    
    // FOREIGN KEYS
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // TIMESTAMPS
    table.timestamps(true, true);  // created_at, updated_at
    
    // INDEXES
    table.index(['tenant_id']);
    table.index(['user_id']);
    table.index(['name', 'tenant_id']);  // For name lookups within tenant
  });
};

/**
 * Rollback migration
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('table_name');
};