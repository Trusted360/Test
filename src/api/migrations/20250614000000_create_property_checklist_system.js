/**
 * Property Checklist System - Complete schema for configurable checklists
 * Builds upon existing user/auth foundation with proper tenant isolation
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.resolve()
    // Properties table - core entity for checklist assignments
    .then(() => {
      return knex.schema.hasTable('properties').then(exists => {
        if (!exists) {
          return knex.schema.createTable('properties', (table) => {
            table.increments('id').primary();
            table.string('name', 255).notNullable();
            table.text('address');
            table.string('property_type', 100); // residential, commercial, industrial, etc.
            table.string('status', 50).defaultTo('active'); // active, inactive, maintenance
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            // Indexes for efficient queries
            table.index(['tenant_id']);
            table.index(['property_type']);
            table.index(['status']);
            table.index(['tenant_id', 'status']);
          });
        }
      });
    })
    
    // Checklist templates - reusable checklist configurations
    .then(() => {
      return knex.schema.hasTable('checklist_templates').then(exists => {
        if (!exists) {
          return knex.schema.createTable('checklist_templates', (table) => {
            table.increments('id').primary();
            table.string('name', 255).notNullable();
            table.text('description');
            table.string('property_type', 100); // filter templates by property type
            table.boolean('is_active').defaultTo(true);
            table.integer('created_by').references('id').inTable('users');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            // Indexes
            table.index(['tenant_id']);
            table.index(['property_type']);
            table.index(['is_active']);
            table.index(['created_by']);
            table.index(['tenant_id', 'is_active']);
          });
        }
      });
    })
    
    // Checklist items - individual items within templates
    .then(() => {
      return knex.schema.hasTable('checklist_items').then(exists => {
        if (!exists) {
          return knex.schema.createTable('checklist_items', (table) => {
            table.increments('id').primary();
            table.integer('template_id').notNullable().references('id').inTable('checklist_templates').onDelete('CASCADE');
            table.text('item_text').notNullable();
            table.string('item_type', 50).defaultTo('text'); // text, checkbox, file_upload, photo, signature
            table.boolean('is_required').defaultTo(false);
            table.integer('sort_order').defaultTo(0);
            table.jsonb('config_json'); // Additional configuration for different item types
            
            // Indexes
            table.index(['template_id']);
            table.index(['item_type']);
            table.index(['template_id', 'sort_order']);
          });
        }
      });
    })
    
    // Property checklists - actual checklist instances assigned to properties
    .then(() => {
      return knex.schema.hasTable('property_checklists').then(exists => {
        if (!exists) {
          return knex.schema.createTable('property_checklists', (table) => {
            table.increments('id').primary();
            table.integer('property_id').references('id').inTable('properties');
            table.integer('template_id').references('id').inTable('checklist_templates');
            table.integer('assigned_to').references('id').inTable('users');
            table.string('status', 50).defaultTo('pending'); // pending, in_progress, completed, approved
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
    
    // Checklist responses - individual item completions
    .then(() => {
      return knex.schema.hasTable('checklist_responses').then(exists => {
        if (!exists) {
          return knex.schema.createTable('checklist_responses', (table) => {
            table.increments('id').primary();
            table.integer('checklist_id').notNullable().references('id').inTable('property_checklists').onDelete('CASCADE');
            table.integer('item_id').notNullable().references('id').inTable('checklist_items');
            table.text('response_value');
            table.text('notes');
            table.integer('completed_by').references('id').inTable('users');
            table.timestamp('completed_at');
            table.boolean('requires_approval').defaultTo(false);
            
            // Indexes
            table.index(['checklist_id']);
            table.index(['item_id']);
            table.index(['completed_by']);
            table.index(['requires_approval']);
          });
        }
      });
    })
    
    // Checklist attachments - file uploads for checklist items
    .then(() => {
      return knex.schema.hasTable('checklist_attachments').then(exists => {
        if (!exists) {
          return knex.schema.createTable('checklist_attachments', (table) => {
            table.increments('id').primary();
            table.integer('response_id').notNullable().references('id').inTable('checklist_responses').onDelete('CASCADE');
            table.string('file_name', 255).notNullable();
            table.string('file_path', 500).notNullable();
            table.string('file_type', 100);
            table.integer('file_size');
            table.integer('uploaded_by').references('id').inTable('users');
            table.timestamp('uploaded_at').defaultTo(knex.fn.now());
            
            // Indexes
            table.index(['response_id']);
            table.index(['uploaded_by']);
          });
        }
      });
    })
    
    // Checklist approvals - governance workflow
    .then(() => {
      return knex.schema.hasTable('checklist_approvals').then(exists => {
        if (!exists) {
          return knex.schema.createTable('checklist_approvals', (table) => {
            table.increments('id').primary();
            table.integer('response_id').references('id').inTable('checklist_responses');
            table.integer('approver_id').references('id').inTable('users');
            table.string('status', 50).defaultTo('pending'); // pending, approved, rejected
            table.text('approval_notes');
            table.timestamp('approved_at');
            table.timestamps(true, true);
            
            // Indexes
            table.index(['response_id']);
            table.index(['approver_id']);
            table.index(['status']);
            table.index(['approver_id', 'status']);
          });
        }
      });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('checklist_approvals')
    .dropTableIfExists('checklist_attachments')
    .dropTableIfExists('checklist_responses')
    .dropTableIfExists('property_checklists')
    .dropTableIfExists('checklist_items')
    .dropTableIfExists('checklist_templates')
    .dropTableIfExists('properties');
};
