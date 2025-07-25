/**
 * Property Checklist System - Complete schema for configurable checklists
 * Builds upon existing user/auth foundation with proper tenant isolation
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.resolve()
    // Property types configuration table
    .then(() => {
      return knex.schema.hasTable('property_types').then(exists => {
        if (!exists) {
          return knex.schema.createTable('property_types', (table) => {
            table.increments('id').primary();
            table.string('code', 50).notNullable().unique();
            table.string('name', 100).notNullable();
            table.text('description');
            table.boolean('is_active').defaultTo(true);
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            table.index(['tenant_id']);
            table.index(['is_active']);
          });
        }
      });
    })
    
    // Insert default property types
    .then(() => {
      return knex('property_types').count('* as count').first().then(result => {
        if (result.count === '0') {
          return knex('property_types').insert([
            { code: 'residential', name: 'Residential', description: 'Residential properties including homes, apartments, condos' },
            { code: 'commercial', name: 'Commercial', description: 'Commercial properties including offices, retail spaces' },
            { code: 'industrial', name: 'Industrial', description: 'Industrial properties including warehouses, factories' },
            { code: 'mixed_use', name: 'Mixed Use', description: 'Properties with multiple use types' },
            { code: 'hospitality', name: 'Hospitality', description: 'Hotels, motels, and other hospitality properties' },
            { code: 'healthcare', name: 'Healthcare', description: 'Medical facilities, hospitals, clinics' },
            { code: 'educational', name: 'Educational', description: 'Schools, universities, training facilities' }
          ]);
        }
      });
    })
    
    // Properties table - core entity for checklist assignments
    .then(() => {
      return knex.schema.hasTable('properties').then(exists => {
        if (!exists) {
          return knex.schema.createTable('properties', (table) => {
            table.increments('id').primary();
            table.string('name', 255).notNullable();
            table.text('address');
            table.integer('property_type_id').references('id').inTable('property_types');
            table.string('status', 50).defaultTo('active'); // active, inactive, maintenance
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            // Indexes for efficient queries
            table.index(['tenant_id']);
            table.index(['property_type_id']);
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
            table.string('category', 100).defaultTo('inspection'); // security, safety, maintenance, compliance, inspection, video_event, etc.
            table.boolean('is_active').defaultTo(true);
            table.integer('created_by').references('id').inTable('users');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            
            // Scheduling and recurring fields
            table.boolean('is_scheduled').defaultTo(false);
            table.string('schedule_frequency', 50); // daily, weekly, bi-weekly, monthly, quarterly, yearly
            table.integer('schedule_interval').defaultTo(1); // For custom intervals (every X days/weeks/months)
            table.json('schedule_days_of_week'); // [1,2,3] for Mon,Tue,Wed (for weekly schedules)
            table.integer('schedule_day_of_month'); // Day of month (for monthly schedules)
            table.time('schedule_time'); // Time of day to create checklist
            table.date('schedule_start_date'); // When to start generating scheduled checklists
            table.date('schedule_end_date'); // When to stop (null = indefinite)
            table.integer('schedule_advance_days').defaultTo(0); // How many days before due date to create checklist
            table.boolean('auto_assign').defaultTo(false); // Auto-assign to property managers
            
            table.timestamps(true, true);
            
            // Indexes
            table.index(['tenant_id']);
            table.index(['category']);
            table.index(['is_active']);
            table.index(['created_by']);
            table.index(['tenant_id', 'is_active']);
            table.index(['is_scheduled']);
            table.index(['schedule_frequency']);
          });
        }
      });
    })
    
    // Template property types association table
    .then(() => {
      return knex.schema.hasTable('template_property_types').then(exists => {
        if (!exists) {
          return knex.schema.createTable('template_property_types', (table) => {
            table.increments('id').primary();
            table.integer('template_id').notNullable().references('id').inTable('checklist_templates').onDelete('CASCADE');
            table.integer('property_type_id').notNullable().references('id').inTable('property_types').onDelete('CASCADE');
            table.timestamps(true, true);
            
            // Ensure unique combinations
            table.unique(['template_id', 'property_type_id']);
            
            // Indexes
            table.index(['template_id']);
            table.index(['property_type_id']);
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
            table.boolean('requires_approval').defaultTo(false);
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
    })
    
    // Checklist comments - item-level discussions
    .then(() => {
      return knex.schema.hasTable('checklist_comments').then(exists => {
        if (!exists) {
          return knex.schema.createTable('checklist_comments', (table) => {
            table.increments('id').primary();
            table.integer('checklist_id').notNullable().references('id').inTable('property_checklists').onDelete('CASCADE');
            table.integer('item_id').notNullable().references('id').inTable('checklist_items');
            table.text('comment_text').notNullable();
            table.integer('created_by').references('id').inTable('users');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            
            // Indexes for efficient queries
            table.index(['checklist_id']);
            table.index(['item_id']);
            table.index(['created_by']);
            table.index(['checklist_id', 'item_id']);
          });
        }
      });
    })
    
    // Scheduled checklist generations - track what's been auto-created
    .then(() => {
      return knex.schema.hasTable('scheduled_checklist_generations').then(exists => {
        if (!exists) {
          return knex.schema.createTable('scheduled_checklist_generations', (table) => {
            table.increments('id').primary();
            table.integer('template_id').notNullable().references('id').inTable('checklist_templates').onDelete('CASCADE');
            table.integer('property_id').references('id').inTable('properties');
            table.date('generation_date').notNullable(); // Date this checklist was scheduled to be generated
            table.date('due_date').notNullable(); // Due date for the generated checklist
            table.integer('checklist_id').references('id').inTable('property_checklists'); // Actual checklist created (null if not yet created)
            table.string('status', 50).defaultTo('pending'); // pending, created, failed
            table.text('error_message'); // Error details if creation failed
            table.timestamp('created_at').defaultTo(knex.fn.now());
            
            // Indexes for efficient queries
            table.index(['template_id']);
            table.index(['property_id']);
            table.index(['generation_date']);
            table.index(['status']);
            table.index(['template_id', 'property_id', 'generation_date']); // Unique constraint alternative
            
            // Prevent duplicate generation for same template/property/date
            table.unique(['template_id', 'property_id', 'generation_date'], { indexName: 'scg_unique_template_property_date' });
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
    .dropTableIfExists('scheduled_checklist_generations')
    .dropTableIfExists('checklist_comments')
    .dropTableIfExists('checklist_approvals')
    .dropTableIfExists('checklist_attachments')
    .dropTableIfExists('checklist_responses')
    .dropTableIfExists('property_checklists')
    .dropTableIfExists('checklist_items')
    .dropTableIfExists('template_property_types')
    .dropTableIfExists('checklist_templates')
    .dropTableIfExists('properties')
    .dropTableIfExists('property_types');
};
