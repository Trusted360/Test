/**
 * Video Analysis & Alerting System - Adapted from archived camera schema
 * Simplified for integer IDs and integrated with properties system
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.resolve()
    // Camera feeds - video sources for analysis
    .then(() => {
      return knex.schema.hasTable('camera_feeds').then(exists => {
        if (!exists) {
          return knex.schema.createTable('camera_feeds', (table) => {
            table.increments('id').primary();
            table.integer('property_id').references('id').inTable('properties');
            table.string('name', 255).notNullable();
            table.string('feed_url', 500);
            table.string('feed_type', 50).defaultTo('rtsp'); // rtsp, http, file
            table.string('location', 255); // entrance, hallway, perimeter, etc.
            table.string('status', 50).defaultTo('active'); // active, inactive, error
            table.jsonb('config_json'); // Camera-specific configuration
            table.timestamps(true, true);
            
            // Indexes
            table.index(['property_id']);
            table.index(['status']);
            table.index(['property_id', 'status']);
          });
        }
      });
    })
    
    // Alert types - configurable alert categories
    .then(() => {
      return knex.schema.hasTable('alert_types').then(exists => {
        if (!exists) {
          return knex.schema.createTable('alert_types', (table) => {
            table.increments('id').primary();
            table.string('name', 255).notNullable();
            table.text('description');
            table.string('severity_level', 50).defaultTo('medium'); // low, medium, high, critical
            table.boolean('auto_create_ticket').defaultTo(false);
            table.boolean('auto_create_checklist').defaultTo(false);
            table.jsonb('config_json'); // Alert-specific configuration
            table.boolean('is_active').defaultTo(true);
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            // Indexes
            table.index(['tenant_id']);
            table.index(['is_active']);
            table.index(['severity_level']);
            table.index(['tenant_id', 'is_active']);
          });
        }
      });
    })
    
    // Video alerts - generated alerts from analysis
    .then(() => {
      return knex.schema.hasTable('video_alerts').then(exists => {
        if (!exists) {
          return knex.schema.createTable('video_alerts', (table) => {
            table.increments('id').primary();
            table.integer('camera_id').references('id').inTable('camera_feeds');
            table.integer('alert_type_id').references('id').inTable('alert_types');
            table.string('severity', 50).defaultTo('medium'); // low, medium, high, critical
            table.jsonb('alert_data_json'); // Analysis results and metadata
            table.string('image_snapshot_path', 500);
            table.string('status', 50).defaultTo('active'); // active, acknowledged, resolved
            table.timestamp('resolved_at');
            table.timestamps(true, true);
            
            // Indexes for alert dashboard
            table.index(['camera_id']);
            table.index(['alert_type_id']);
            table.index(['status']);
            table.index(['severity']);
            table.index(['created_at']);
            table.index(['status', 'severity']);
          });
        }
      });
    })
    
    // Service tickets - generated from alerts
    .then(() => {
      return knex.schema.hasTable('service_tickets').then(exists => {
        if (!exists) {
          return knex.schema.createTable('service_tickets', (table) => {
            table.increments('id').primary();
            table.integer('property_id').references('id').inTable('properties');
            table.integer('alert_id').references('id').inTable('video_alerts');
            table.string('title', 255).notNullable();
            table.text('description');
            table.string('priority', 50).defaultTo('medium'); // low, medium, high, urgent
            table.string('status', 50).defaultTo('open'); // open, in_progress, resolved, closed
            table.integer('assigned_to').references('id').inTable('users');
            table.timestamps(true, true);
            
            // Indexes
            table.index(['property_id']);
            table.index(['alert_id']);
            table.index(['assigned_to']);
            table.index(['status']);
            table.index(['priority']);
            table.index(['assigned_to', 'status']);
          });
        }
      });
    })
    
    // Alert generated checklists - link alerts to auto-created checklists
    .then(() => {
      return knex.schema.hasTable('alert_generated_checklists').then(exists => {
        if (!exists) {
          return knex.schema.createTable('alert_generated_checklists', (table) => {
            table.increments('id').primary();
            table.integer('alert_id').references('id').inTable('video_alerts');
            table.integer('checklist_id').references('id').inTable('property_checklists');
            table.boolean('auto_generated').defaultTo(true);
            table.text('trigger_reason');
            table.timestamps(true, true);
            
            // Indexes
            table.index(['alert_id']);
            table.index(['checklist_id']);
            table.index(['auto_generated']);
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
    .dropTableIfExists('alert_generated_checklists')
    .dropTableIfExists('service_tickets')
    .dropTableIfExists('video_alerts')
    .dropTableIfExists('alert_types')
    .dropTableIfExists('camera_feeds');
};
