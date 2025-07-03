/**
 * Property Manager Reporting System - Enhanced checklist tracking and action items
 * Focuses on operational reporting needs for property managers
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.resolve()
    // Add severity and issue tracking to checklist responses
    .then(() => {
      return knex.schema.hasColumn('checklist_responses', 'issue_severity').then(exists => {
        if (!exists) {
          return knex.schema.alterTable('checklist_responses', (table) => {
            table.string('issue_severity', 50).nullable(); // none, minor, moderate, major, critical
            table.boolean('requires_action').defaultTo(false);
            table.text('issue_description'); // Detailed description of the problem
            table.jsonb('issue_metadata'); // Additional context (location, equipment, etc.)
            
            // Indexes for issue queries
            table.index(['issue_severity']);
            table.index(['requires_action']);
            table.index(['checklist_id', 'requires_action']);
          });
        }
      });
    })
    
    // Action items table - follow-up tasks from inspections
    .then(() => {
      return knex.schema.hasTable('action_items').then(exists => {
        if (!exists) {
          return knex.schema.createTable('action_items', (table) => {
            table.increments('id').primary();
            table.integer('checklist_response_id').references('id').inTable('checklist_responses');
            table.integer('property_id').notNullable().references('id').inTable('properties');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            
            // Issue details
            table.string('title', 255).notNullable();
            table.text('description').notNullable();
            table.string('severity', 50).notNullable(); // minor, moderate, major, critical
            table.string('category', 100); // electrical, plumbing, safety, security, maintenance, compliance
            
            // Assignment and tracking
            table.integer('reported_by').references('id').inTable('users');
            table.integer('assigned_to').references('id').inTable('users');
            table.string('status', 50).defaultTo('open'); // open, in_progress, blocked, completed, cancelled
            table.string('priority', 50).defaultTo('medium'); // low, medium, high, urgent
            
            // Timing
            table.timestamp('due_date');
            table.timestamp('started_at');
            table.timestamp('completed_at');
            table.integer('estimated_hours');
            table.integer('actual_hours');
            
            // Resolution
            table.text('resolution_notes');
            table.decimal('cost', 10, 2);
            table.boolean('prevented_future_issue').defaultTo(false);
            
            // Vendor management
            table.string('vendor_name', 255);
            table.string('vendor_contact', 255);
            table.string('work_order_number', 100);
            
            // Relationships
            table.integer('parent_action_id').references('id').inTable('action_items');
            table.integer('related_video_alert_id');
            
            table.timestamps(true, true);
            
            // Indexes for performance
            table.index(['property_id']);
            table.index(['tenant_id']);
            table.index(['assigned_to']);
            table.index(['status']);
            table.index(['priority']);
            table.index(['due_date']);
            table.index(['property_id', 'status']);
            table.index(['assigned_to', 'status']);
            table.index(['tenant_id', 'status', 'priority']);
          });
        }
      });
    })
    
    // Action item updates tracking
    .then(() => {
      return knex.schema.hasTable('action_item_updates').then(exists => {
        if (!exists) {
          return knex.schema.createTable('action_item_updates', (table) => {
            table.increments('id').primary();
            table.integer('action_item_id').notNullable().references('id').inTable('action_items').onDelete('CASCADE');
            table.integer('updated_by').references('id').inTable('users');
            table.string('update_type', 50); // status_change, assignment, note, completion
            table.text('update_note');
            table.string('old_value', 255);
            table.string('new_value', 255);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            
            // Indexes
            table.index(['action_item_id']);
            table.index(['updated_by']);
            table.index(['created_at']);
          });
        }
      });
    })
    
    // Property inspection summary table - aggregated view for reporting
    .then(() => {
      return knex.schema.hasTable('property_inspection_summary').then(exists => {
        if (!exists) {
          return knex.schema.createTable('property_inspection_summary', (table) => {
            table.increments('id').primary();
            table.integer('property_id').notNullable().references('id').inTable('properties');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.date('inspection_date').notNullable();
            table.string('inspection_type', 100); // daily, weekly, monthly, annual, incident
            
            // Completion metrics
            table.integer('total_items').defaultTo(0);
            table.integer('completed_items').defaultTo(0);
            table.integer('failed_items').defaultTo(0);
            table.integer('items_with_issues').defaultTo(0);
            table.decimal('completion_percentage', 5, 2);
            
            // Issue breakdown
            table.integer('critical_issues').defaultTo(0);
            table.integer('major_issues').defaultTo(0);
            table.integer('moderate_issues').defaultTo(0);
            table.integer('minor_issues').defaultTo(0);
            
            // Action items
            table.integer('action_items_created').defaultTo(0);
            table.integer('action_items_resolved').defaultTo(0);
            table.decimal('estimated_repair_cost', 10, 2);
            
            // Performance
            table.integer('inspection_duration_minutes');
            table.integer('inspector_id').references('id').inTable('users');
            table.decimal('quality_score', 5, 2); // Based on completeness, detail, photos
            
            // Compliance
            table.boolean('meets_compliance').defaultTo(true);
            table.jsonb('compliance_failures'); // Array of specific compliance issues
            
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
            
            // Indexes
            table.index(['property_id']);
            table.index(['tenant_id']);
            table.index(['inspection_date']);
            table.index(['inspection_type']);
            table.index(['property_id', 'inspection_date']);
            table.unique(['property_id', 'inspection_date', 'inspection_type']);
          });
        }
      });
    })
    
    // Recurring issues tracking - identify patterns
    .then(() => {
      return knex.schema.hasTable('recurring_issues').then(exists => {
        if (!exists) {
          return knex.schema.createTable('recurring_issues', (table) => {
            table.increments('id').primary();
            table.integer('property_id').notNullable().references('id').inTable('properties');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.string('issue_category', 100).notNullable();
            table.string('issue_pattern', 255).notNullable(); // Brief description of recurring issue
            table.integer('occurrence_count').defaultTo(1);
            table.timestamp('first_reported').defaultTo(knex.fn.now());
            table.timestamp('last_reported').defaultTo(knex.fn.now());
            table.decimal('total_cost', 10, 2).defaultTo(0);
            table.text('root_cause_analysis');
            table.text('prevention_recommendation');
            table.string('status', 50).defaultTo('active'); // active, resolved, monitoring
            
            table.timestamps(true, true);
            
            // Indexes
            table.index(['property_id']);
            table.index(['tenant_id']);
            table.index(['issue_category']);
            table.index(['status']);
            table.index(['property_id', 'status']);
          });
        }
      });
    })
    
    // Property manager dashboard metrics - real-time KPIs
    .then(() => {
      return knex.schema.hasTable('property_manager_metrics').then(exists => {
        if (!exists) {
          return knex.schema.createTable('property_manager_metrics', (table) => {
            table.increments('id').primary();
            table.integer('property_id').references('id').inTable('properties');
            table.integer('user_id').references('id').inTable('users'); // For staff metrics
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.string('metric_type', 100).notNullable(); // property_health, staff_performance, issue_resolution
            table.date('metric_date').notNullable();
            
            // Property Health Metrics
            table.integer('open_action_items').defaultTo(0);
            table.integer('overdue_action_items').defaultTo(0);
            table.integer('inspections_completed').defaultTo(0);
            table.integer('inspections_missed').defaultTo(0);
            table.decimal('property_score', 5, 2); // 0-100 health score
            
            // Issue Metrics
            table.integer('new_issues_reported').defaultTo(0);
            table.integer('issues_resolved').defaultTo(0);
            table.decimal('avg_resolution_hours', 8, 2);
            table.decimal('issue_cost_total', 10, 2);
            
            // Staff Performance (when user_id is set)
            table.integer('tasks_completed').defaultTo(0);
            table.integer('inspections_performed').defaultTo(0);
            table.decimal('avg_inspection_quality', 5, 2);
            table.decimal('on_time_completion_rate', 5, 2);
            
            // Compliance & Risk
            table.integer('compliance_violations').defaultTo(0);
            table.integer('safety_incidents').defaultTo(0);
            table.boolean('requires_attention').defaultTo(false);
            table.jsonb('attention_reasons'); // Array of reasons why attention is needed
            
            table.timestamp('calculated_at').defaultTo(knex.fn.now());
            
            // Indexes
            table.index(['property_id']);
            table.index(['user_id']);
            table.index(['tenant_id']);
            table.index(['metric_type']);
            table.index(['metric_date']);
            table.index(['requires_attention']);
            table.index(['property_id', 'metric_date']);
            table.index(['user_id', 'metric_date']);
            table.unique(['property_id', 'user_id', 'metric_type', 'metric_date', 'tenant_id']);
          });
        }
      });
    })
    
    // Create views for common reporting queries
    .then(() => {
      return knex.raw(`
        CREATE OR REPLACE VIEW active_issues_by_property AS
        SELECT 
          p.id as property_id,
          p.name as property_name,
          p.tenant_id,
          COUNT(CASE WHEN ai.status = 'open' THEN 1 END) as open_issues,
          COUNT(CASE WHEN ai.status = 'in_progress' THEN 1 END) as in_progress_issues,
          COUNT(CASE WHEN ai.due_date < CURRENT_TIMESTAMP AND ai.status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue_issues,
          COUNT(CASE WHEN ai.severity = 'critical' AND ai.status NOT IN ('completed', 'cancelled') THEN 1 END) as critical_issues,
          COUNT(CASE WHEN ai.severity = 'major' AND ai.status NOT IN ('completed', 'cancelled') THEN 1 END) as major_issues,
          SUM(CASE WHEN ai.status NOT IN ('completed', 'cancelled') THEN ai.cost ELSE 0 END) as estimated_cost,
          MIN(CASE WHEN ai.status NOT IN ('completed', 'cancelled') THEN ai.due_date END) as next_due_date
        FROM properties p
        LEFT JOIN action_items ai ON p.id = ai.property_id
        GROUP BY p.id, p.name, p.tenant_id;
      `);
    })
    
    .then(() => {
      return knex.raw(`
        CREATE OR REPLACE VIEW recent_inspection_results AS
        SELECT 
          pc.id as checklist_id,
          p.id as property_id,
          p.name as property_name,
          ct.name as checklist_name,
          pc.status,
          pc.completed_at,
          CONCAT(u.first_name, ' ', u.last_name) as inspector_name,
          COUNT(DISTINCT cr.id) as total_responses,
          COUNT(DISTINCT CASE WHEN cr.issue_severity IS NOT NULL AND cr.issue_severity != 'none' THEN cr.id END) as issues_found,
          COUNT(DISTINCT CASE WHEN cr.issue_severity IN ('major', 'critical') THEN cr.id END) as serious_issues,
          COUNT(DISTINCT ca.id) as photos_attached,
          COUNT(DISTINCT ai.id) as action_items_created
        FROM property_checklists pc
        JOIN properties p ON pc.property_id = p.id
        JOIN checklist_templates ct ON pc.template_id = ct.id
        LEFT JOIN users u ON pc.assigned_to = u.id
        LEFT JOIN checklist_responses cr ON pc.id = cr.checklist_id
        LEFT JOIN checklist_attachments ca ON cr.id = ca.response_id
        LEFT JOIN action_items ai ON cr.id = ai.checklist_response_id
        WHERE pc.completed_at IS NOT NULL
        GROUP BY pc.id, p.id, p.name, ct.name, pc.status, pc.completed_at, u.first_name, u.last_name
        ORDER BY pc.completed_at DESC;
      `);
    })
    
    // Insert issue categories
    .then(() => {
      return knex('action_items').count('* as count').first().then(result => {
        // This is just to check if we need to add reference data
        // In production, this would be in a separate reference table
        return true;
      });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw('DROP VIEW IF EXISTS recent_inspection_results')
    .then(() => knex.raw('DROP VIEW IF EXISTS active_issues_by_property'))
    .then(() => knex.schema.dropTableIfExists('property_manager_metrics'))
    .then(() => knex.schema.dropTableIfExists('recurring_issues'))
    .then(() => knex.schema.dropTableIfExists('property_inspection_summary'))
    .then(() => knex.schema.dropTableIfExists('action_item_updates'))
    .then(() => knex.schema.dropTableIfExists('action_items'))
    .then(() => {
      return knex.schema.alterTable('checklist_responses', (table) => {
        table.dropColumn('issue_severity');
        table.dropColumn('requires_action');
        table.dropColumn('issue_description');
        table.dropColumn('issue_metadata');
      });
    });
};