/**
 * Create simple SOP tables using the EXACT working checklist pattern
 * Uses hasTable() checks like the working checklist migration - NO DROPS!
 */

exports.up = function(knex) {
  return Promise.resolve()
    // SOP templates table (mirrors checklist_templates exactly)
    .then(() => {
      return knex.schema.hasTable('sop_templates').then(exists => {
        if (!exists) {
          console.log('Creating SOP templates table...');
          return knex.schema.createTable('sop_templates', (table) => {
            table.increments('id').primary();
            table.string('name', 255).notNullable();
            table.text('description');
            table.string('category', 100).defaultTo('procedure');
            table.boolean('is_active').defaultTo(true);
            table.integer('created_by').references('id').inTable('users');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            // Indexes
            table.index(['tenant_id']);
            table.index(['category']);
            table.index(['is_active']);
            table.index(['created_by']);
            table.index(['tenant_id', 'is_active']);
          });
        }
      });
    })
    
    // SOP items table (mirrors checklist_items exactly)
    .then(() => {
      return knex.schema.hasTable('sop_items').then(exists => {
        if (!exists) {
          console.log('Creating SOP items table...');
          return knex.schema.createTable('sop_items', (table) => {
            table.increments('id').primary();
            table.integer('template_id').notNullable().references('id').inTable('sop_templates').onDelete('CASCADE');
            table.text('item_text').notNullable();
            table.string('item_type', 50).defaultTo('text');
            table.boolean('is_required').defaultTo(false);
            table.boolean('requires_approval').defaultTo(false);
            table.integer('sort_order').defaultTo(0);
            table.jsonb('config_json');
            
            // Indexes
            table.index(['template_id']);
            table.index(['item_type']);
            table.index(['template_id', 'sort_order']);
          });
        }
      });
    })
    
    // Property SOPs table (mirrors property_checklists exactly)
    .then(() => {
      return knex.schema.hasTable('property_sops').then(exists => {
        if (!exists) {
          console.log('Creating property SOPs table...');
          return knex.schema.createTable('property_sops', (table) => {
            table.increments('id').primary();
            table.integer('property_id').references('id').inTable('properties');
            table.integer('template_id').references('id').inTable('sop_templates');
            table.integer('assigned_to').references('id').inTable('users');
            table.string('status', 50).defaultTo('pending');
            table.timestamp('due_date');
            table.timestamp('completed_at');
            table.timestamps(true, true);
            
            // Indexes for dashboard queries
            table.index(['property_id']);
            table.index(['assigned_to']);
            table.index(['status']);
            table.index(['due_date']);
            table.index(['assigned_to', 'status']);
          });
        }
      });
    })
    
    // SOP responses table (for storing responses to SOP items)
    .then(() => {
      return knex.schema.hasTable('sop_responses').then(exists => {
        if (!exists) {
          console.log('Creating SOP responses table...');
          return knex.schema.createTable('sop_responses', (table) => {
            table.increments('id').primary();
            table.integer('sop_id').notNullable().references('id').inTable('property_sops').onDelete('CASCADE');
            table.integer('item_id').notNullable().references('id').inTable('sop_items').onDelete('CASCADE');
            table.text('response_value');
            table.text('notes');
            table.integer('completed_by').references('id').inTable('users');
            table.timestamp('completed_at');
            
            // Indexes
            table.index(['sop_id']);
            table.index(['item_id']);
            table.index(['sop_id', 'item_id']);
            
            // Unique constraint to prevent duplicate responses
            table.unique(['sop_id', 'item_id']);
          });
        }
      });
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('sop_responses')
    .dropTableIfExists('property_sops')
    .dropTableIfExists('sop_items')
    .dropTableIfExists('sop_templates');
};