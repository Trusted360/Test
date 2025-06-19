/**
 * Settings System - Global and User Settings Management
 * Supports notification targets, service ticket integration, and camera feed settings
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.resolve()
    // Global settings table - system-wide configuration
    .then(() => {
      return knex.schema.hasTable('global_settings').then(exists => {
        if (!exists) {
          return knex.schema.createTable('global_settings', (table) => {
            table.increments('id').primary();
            table.string('setting_key', 100).notNullable().unique();
            table.text('setting_value');
            table.string('setting_type', 50).defaultTo('string'); // string, number, boolean, json
            table.text('description');
            table.string('category', 50).defaultTo('general'); // general, notifications, integrations, security
            table.boolean('is_encrypted').defaultTo(false);
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            table.index(['tenant_id']);
            table.index(['category']);
            table.index(['setting_key']);
          });
        }
      });
    })
    
    // User settings table - per-user preferences
    .then(() => {
      return knex.schema.hasTable('user_settings').then(exists => {
        if (!exists) {
          return knex.schema.createTable('user_settings', (table) => {
            table.increments('id').primary();
            table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('setting_key', 100).notNullable();
            table.text('setting_value');
            table.string('setting_type', 50).defaultTo('string'); // string, number, boolean, json
            table.timestamps(true, true);
            
            table.unique(['user_id', 'setting_key']);
            table.index(['user_id']);
            table.index(['setting_key']);
          });
        }
      });
    })
    
    // Notification targets table - email, SMS, webhook endpoints
    .then(() => {
      return knex.schema.hasTable('notification_targets').then(exists => {
        if (!exists) {
          return knex.schema.createTable('notification_targets', (table) => {
            table.increments('id').primary();
            table.string('name', 255).notNullable();
            table.string('type', 50).notNullable(); // email, sms, webhook, slack
            table.text('target_address').notNullable(); // email address, phone number, webhook URL
            table.jsonb('config_json'); // Additional configuration (headers, auth, etc.)
            table.boolean('is_active').defaultTo(true);
            table.integer('created_by').references('id').inTable('users');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            table.index(['tenant_id']);
            table.index(['type']);
            table.index(['is_active']);
            table.index(['created_by']);
          });
        }
      });
    })
    
    // Service ticket integration settings
    .then(() => {
      return knex.schema.hasTable('service_integrations').then(exists => {
        if (!exists) {
          return knex.schema.createTable('service_integrations', (table) => {
            table.increments('id').primary();
            table.string('name', 255).notNullable();
            table.string('integration_type', 50).notNullable(); // jira, servicenow, zendesk, freshservice
            table.string('base_url', 500).notNullable();
            table.string('api_key', 500); // Encrypted
            table.string('username', 255);
            table.jsonb('config_json'); // Integration-specific settings
            table.boolean('is_active').defaultTo(true);
            table.boolean('auto_create_tickets').defaultTo(false);
            table.string('default_project_key', 100);
            table.string('default_issue_type', 100);
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            table.index(['tenant_id']);
            table.index(['integration_type']);
            table.index(['is_active']);
          });
        }
      });
    })
    
    // Camera feed integration settings (extends existing camera_feeds)
    .then(() => {
      return knex.schema.hasTable('camera_feed_settings').then(exists => {
        if (!exists) {
          return knex.schema.createTable('camera_feed_settings', (table) => {
            table.increments('id').primary();
            table.integer('camera_feed_id').notNullable().references('id').inTable('camera_feeds').onDelete('CASCADE');
            table.integer('property_id').references('id').inTable('properties');
            table.jsonb('alert_rules'); // Custom alert rules for this camera
            table.jsonb('recording_settings'); // Recording preferences
            table.jsonb('notification_settings'); // Which notification targets to use
            table.boolean('motion_detection_enabled').defaultTo(true);
            table.boolean('person_detection_enabled').defaultTo(false);
            table.boolean('vehicle_detection_enabled').defaultTo(false);
            table.integer('sensitivity_level').defaultTo(5); // 1-10 scale
            table.timestamps(true, true);
            
            table.index(['camera_feed_id']);
            table.index(['property_id']);
          });
        }
      });
    })
    
    // Property notification assignments - which properties use which notification targets
    .then(() => {
      return knex.schema.hasTable('property_notification_targets').then(exists => {
        if (!exists) {
          return knex.schema.createTable('property_notification_targets', (table) => {
            table.increments('id').primary();
            table.integer('property_id').notNullable().references('id').inTable('properties').onDelete('CASCADE');
            table.integer('notification_target_id').notNullable().references('id').inTable('notification_targets').onDelete('CASCADE');
            table.string('alert_types', 500); // JSON array of alert types to send to this target
            table.boolean('is_active').defaultTo(true);
            table.timestamps(true, true);
            
            table.unique(['property_id', 'notification_target_id']);
            table.index(['property_id']);
            table.index(['notification_target_id']);
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
    .dropTableIfExists('property_notification_targets')
    .dropTableIfExists('camera_feed_settings')
    .dropTableIfExists('service_integrations')
    .dropTableIfExists('notification_targets')
    .dropTableIfExists('user_settings')
    .dropTableIfExists('global_settings');
};
