/**
 * Audit System - Comprehensive activity tracking and reporting
 * Tracks all user actions, system events, and generates reports
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.resolve()
    // Audit event types - categorize different types of events
    .then(() => {
      return knex.schema.hasTable('audit_event_types').then(exists => {
        if (!exists) {
          return knex.schema.createTable('audit_event_types', (table) => {
            table.increments('id').primary();
            table.string('category', 100).notNullable(); // checklist, video, template, user, property, system
            table.string('action', 100).notNullable(); // created, updated, deleted, completed, assigned, triggered
            table.string('description', 255);
            table.boolean('is_active').defaultTo(true);
            table.timestamps(true, true);
            
            // Indexes
            table.index(['category']);
            table.index(['action']);
            table.index(['category', 'action']);
            table.unique(['category', 'action']);
          });
        }
      });
    })
    
    // Main audit log table - stores all audit events
    .then(() => {
      return knex.schema.hasTable('audit_logs').then(exists => {
        if (!exists) {
          return knex.schema.createTable('audit_logs', (table) => {
            table.increments('id').primary();
            table.integer('event_type_id').references('id').inTable('audit_event_types');
            table.integer('user_id').references('id').inTable('users');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.integer('property_id').references('id').inTable('properties');
            
            // Entity references - polymorphic associations
            table.string('entity_type', 100); // checklist, template, video_alert, user, property, etc.
            table.integer('entity_id'); // ID of the entity
            
            // Event details
            table.string('action', 100).notNullable(); // created, updated, deleted, etc.
            table.text('description'); // Human-readable description
            table.jsonb('old_values'); // Previous state (for updates)
            table.jsonb('new_values'); // New state
            table.jsonb('metadata'); // Additional context
            
            // Request context
            table.string('ip_address', 45);
            table.string('user_agent', 500);
            table.string('session_id', 255);
            
            table.timestamp('created_at').defaultTo(knex.fn.now());
            
            // Indexes for efficient querying
            table.index(['user_id']);
            table.index(['tenant_id']);
            table.index(['property_id']);
            table.index(['entity_type', 'entity_id']);
            table.index(['created_at']);
            table.index(['tenant_id', 'created_at']);
            table.index(['user_id', 'created_at']);
            table.index(['property_id', 'created_at']);
            table.index(['event_type_id']);
          });
        }
      });
    })
    
    // Audit report templates - predefined report configurations
    .then(() => {
      return knex.schema.hasTable('audit_report_templates').then(exists => {
        if (!exists) {
          return knex.schema.createTable('audit_report_templates', (table) => {
            table.increments('id').primary();
            table.string('name', 255).notNullable();
            table.text('description');
            table.string('report_type', 100).notNullable(); // activity, compliance, security, performance
            table.jsonb('filters'); // Predefined filters for the report
            table.jsonb('columns'); // Which columns to include
            table.jsonb('grouping'); // How to group data
            table.jsonb('sorting'); // Default sort order
            table.boolean('is_system').defaultTo(false); // System vs user-created
            table.boolean('is_active').defaultTo(true);
            table.integer('created_by').references('id').inTable('users');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            // Indexes
            table.index(['tenant_id']);
            table.index(['report_type']);
            table.index(['is_active']);
            table.index(['created_by']);
          });
        }
      });
    })
    
    // Scheduled reports - automated report generation
    .then(() => {
      return knex.schema.hasTable('audit_scheduled_reports').then(exists => {
        if (!exists) {
          return knex.schema.createTable('audit_scheduled_reports', (table) => {
            table.increments('id').primary();
            table.integer('template_id').references('id').inTable('audit_report_templates');
            table.string('name', 255).notNullable();
            table.string('frequency', 50).notNullable(); // daily, weekly, monthly, quarterly
            table.jsonb('schedule_config'); // Cron expression or specific schedule details
            table.jsonb('recipients'); // Email addresses or user IDs
            table.string('format', 50).defaultTo('pdf'); // pdf, csv, excel
            table.boolean('is_active').defaultTo(true);
            table.integer('created_by').references('id').inTable('users');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamp('last_run_at');
            table.timestamp('next_run_at');
            table.timestamps(true, true);
            
            // Indexes
            table.index(['tenant_id']);
            table.index(['is_active']);
            table.index(['next_run_at']);
            table.index(['created_by']);
          });
        }
      });
    })
    
    // Generated reports - store generated report instances
    .then(() => {
      return knex.schema.hasTable('audit_generated_reports').then(exists => {
        if (!exists) {
          return knex.schema.createTable('audit_generated_reports', (table) => {
            table.increments('id').primary();
            table.integer('template_id').references('id').inTable('audit_report_templates');
            table.integer('scheduled_report_id').references('id').inTable('audit_scheduled_reports');
            table.string('report_name', 255).notNullable();
            table.timestamp('start_date').notNullable();
            table.timestamp('end_date').notNullable();
            table.string('file_path', 500);
            table.string('format', 50).defaultTo('pdf');
            table.integer('record_count');
            table.jsonb('filters_applied'); // Actual filters used
            table.jsonb('summary_stats'); // Key metrics from the report
            table.integer('generated_by').references('id').inTable('users');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamp('generated_at').defaultTo(knex.fn.now());
            table.timestamp('expires_at'); // When to auto-delete
            
            // Indexes
            table.index(['tenant_id']);
            table.index(['template_id']);
            table.index(['generated_by']);
            table.index(['generated_at']);
            table.index(['expires_at']);
          });
        }
      });
    })
    
    // Audit metrics - aggregated metrics for dashboards
    .then(() => {
      return knex.schema.hasTable('audit_metrics').then(exists => {
        if (!exists) {
          return knex.schema.createTable('audit_metrics', (table) => {
            table.increments('id').primary();
            table.string('metric_type', 100).notNullable(); // daily_activity, property_compliance, user_performance
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.integer('property_id').references('id').inTable('properties');
            table.integer('user_id').references('id').inTable('users');
            table.date('metric_date').notNullable();
            table.jsonb('metrics').notNullable(); // Actual metric values
            table.timestamp('calculated_at').defaultTo(knex.fn.now());
            
            // Indexes for efficient aggregation queries
            table.index(['metric_type']);
            table.index(['tenant_id']);
            table.index(['metric_date']);
            table.index(['property_id']);
            table.index(['user_id']);
            table.index(['tenant_id', 'metric_type', 'metric_date']);
            table.unique(['metric_type', 'tenant_id', 'property_id', 'user_id', 'metric_date']);
          });
        }
      });
    })
    
    // Property manager context table for enhanced tracking
    .then(() => {
      return knex.schema.hasTable('audit_context').then(exists => {
        if (!exists) {
          return knex.schema.createTable('audit_context', (table) => {
            table.increments('id').primary();
            table.integer('audit_log_id').references('id').inTable('audit_logs').onDelete('CASCADE');
            table.decimal('cost_amount', 10, 2);
            table.string('urgency_level', 50); // routine, urgent, emergency
            table.string('business_impact', 255); // revenue_impact, compliance_risk, tenant_satisfaction
            table.integer('response_time_minutes');
            table.integer('resolution_time_hours');
            table.jsonb('additional_context');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            
            // Indexes
            table.index(['audit_log_id']);
            table.index(['urgency_level']);
          });
        }
      });
    })
    
    // Operational metrics for property managers
    .then(() => {
      return knex.schema.hasTable('operational_metrics').then(exists => {
        if (!exists) {
          return knex.schema.createTable('operational_metrics', (table) => {
            table.increments('id').primary();
            table.integer('property_id').references('id').inTable('properties');
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.date('metric_date').notNullable();
            
            // Response metrics
            table.integer('avg_alert_response_minutes');
            table.integer('avg_work_order_hours');
            table.integer('emergency_response_minutes');
            
            // Compliance metrics
            table.integer('inspections_completed').defaultTo(0);
            table.integer('inspections_passed').defaultTo(0);
            table.integer('violations_found').defaultTo(0);
            table.integer('violations_resolved').defaultTo(0);
            table.decimal('compliance_score', 5, 2);
            
            // Efficiency metrics
            table.integer('tasks_completed').defaultTo(0);
            table.integer('tasks_overdue').defaultTo(0);
            table.integer('checklists_completed').defaultTo(0);
            table.decimal('staff_utilization', 5, 2);
            
            // Financial impact
            table.decimal('maintenance_costs', 10, 2);
            table.decimal('emergency_costs', 10, 2);
            table.decimal('preventive_savings', 10, 2);
            
            // Video analytics
            table.integer('alerts_triggered').defaultTo(0);
            table.integer('alerts_resolved').defaultTo(0);
            table.integer('false_positives').defaultTo(0);
            
            table.timestamp('calculated_at').defaultTo(knex.fn.now());
            
            // Indexes
            table.index(['property_id']);
            table.index(['tenant_id']);
            table.index(['metric_date']);
            table.index(['property_id', 'metric_date']);
            table.unique(['property_id', 'tenant_id', 'metric_date']);
          });
        }
      });
    })
    
    // Insert default audit event types
    .then(() => {
      return knex('audit_event_types').count('* as count').first().then(result => {
        if (result.count === '0') {
          return knex('audit_event_types').insert([
            // Checklist events
            { category: 'checklist', action: 'created', description: 'Checklist created' },
            { category: 'checklist', action: 'assigned', description: 'Checklist assigned to user' },
            { category: 'checklist', action: 'started', description: 'Checklist work started' },
            { category: 'checklist', action: 'completed', description: 'Checklist completed' },
            { category: 'checklist', action: 'approved', description: 'Checklist approved' },
            { category: 'checklist', action: 'rejected', description: 'Checklist rejected' },
            { category: 'checklist', action: 'deleted', description: 'Checklist deleted' },
            { category: 'checklist', action: 'overdue', description: 'Checklist became overdue' },
            
            // Template events
            { category: 'template', action: 'created', description: 'Template created' },
            { category: 'template', action: 'updated', description: 'Template updated' },
            { category: 'template', action: 'deleted', description: 'Template deleted' },
            { category: 'template', action: 'activated', description: 'Template activated' },
            { category: 'template', action: 'deactivated', description: 'Template deactivated' },
            
            // Video events
            { category: 'video', action: 'alert_triggered', description: 'Video alert triggered' },
            { category: 'video', action: 'alert_acknowledged', description: 'Video alert acknowledged' },
            { category: 'video', action: 'alert_resolved', description: 'Video alert resolved' },
            { category: 'video', action: 'checklist_generated', description: 'Checklist generated from video alert' },
            { category: 'video', action: 'ticket_created', description: 'Service ticket created from video alert' },
            { category: 'video', action: 'false_positive', description: 'Alert marked as false positive' },
            
            // User events
            { category: 'user', action: 'created', description: 'User account created' },
            { category: 'user', action: 'updated', description: 'User account updated' },
            { category: 'user', action: 'deleted', description: 'User account deleted' },
            { category: 'user', action: 'login', description: 'User logged in' },
            { category: 'user', action: 'logout', description: 'User logged out' },
            { category: 'user', action: 'password_changed', description: 'User password changed' },
            { category: 'user', action: 'role_changed', description: 'User role changed' },
            
            // Property events
            { category: 'property', action: 'created', description: 'Property created' },
            { category: 'property', action: 'updated', description: 'Property updated' },
            { category: 'property', action: 'deleted', description: 'Property deleted' },
            { category: 'property', action: 'activated', description: 'Property activated' },
            { category: 'property', action: 'deactivated', description: 'Property deactivated' },
            { category: 'property', action: 'inspection_scheduled', description: 'Property inspection scheduled' },
            
            // Maintenance events (property manager focused)
            { category: 'maintenance', action: 'work_order_created', description: 'Work order created' },
            { category: 'maintenance', action: 'work_order_assigned', description: 'Work order assigned to vendor' },
            { category: 'maintenance', action: 'work_order_completed', description: 'Work order completed' },
            { category: 'maintenance', action: 'emergency_reported', description: 'Emergency maintenance reported' },
            { category: 'maintenance', action: 'preventive_scheduled', description: 'Preventive maintenance scheduled' },
            
            // Compliance events
            { category: 'compliance', action: 'inspection_due', description: 'Inspection due soon' },
            { category: 'compliance', action: 'inspection_completed', description: 'Inspection completed' },
            { category: 'compliance', action: 'violation_found', description: 'Compliance violation found' },
            { category: 'compliance', action: 'violation_resolved', description: 'Compliance violation resolved' },
            { category: 'compliance', action: 'certification_expired', description: 'Certification expired' },
            { category: 'compliance', action: 'certification_renewed', description: 'Certification renewed' },
            
            // System events
            { category: 'system', action: 'backup_created', description: 'System backup created' },
            { category: 'system', action: 'maintenance_started', description: 'System maintenance started' },
            { category: 'system', action: 'maintenance_completed', description: 'System maintenance completed' },
            { category: 'system', action: 'error', description: 'System error occurred' },
            { category: 'system', action: 'escalation_triggered', description: 'Issue escalated to management' }
          ]);
        }
      });
    })
    
    // Insert default report templates
    .then(() => {
      return knex('audit_report_templates').count('* as count').first().then(result => {
        if (result.count === '0') {
          return knex('audit_report_templates').insert([
            // Property Manager Daily Reports
            {
              name: 'Daily Operations Dashboard',
              description: 'Start-of-day overview for property managers with actionable items',
              report_type: 'activity',
              filters: JSON.stringify({
                date_range: 'last_24_hours',
                categories: ['checklist', 'video', 'maintenance', 'compliance'],
                priority_items: true
              }),
              columns: JSON.stringify(['time', 'property', 'urgency', 'task', 'assigned_to', 'status', 'action_required']),
              grouping: JSON.stringify(['urgency', 'property']),
              sorting: JSON.stringify([{ column: 'urgency', direction: 'desc' }, { column: 'time', direction: 'desc' }]),
              is_system: true
            },
            {
              name: 'Property Health Check',
              description: 'Quick overview of each property\'s operational status',
              report_type: 'compliance',
              filters: JSON.stringify({
                date_range: 'current_week',
                show_metrics: true
              }),
              columns: JSON.stringify(['property', 'open_tasks', 'overdue_items', 'compliance_score', 'recent_alerts', 'upcoming_inspections']),
              grouping: JSON.stringify(['property_type']),
              sorting: JSON.stringify([{ column: 'overdue_items', direction: 'desc' }]),
              is_system: true
            },
            
            // Staff Performance Reports
            {
              name: 'Team Performance Summary',
              description: 'Track staff productivity and task completion rates',
              report_type: 'performance',
              filters: JSON.stringify({
                date_range: 'weekly',
                categories: ['checklist', 'maintenance'],
                include_response_times: true
              }),
              columns: JSON.stringify(['staff_member', 'tasks_completed', 'avg_completion_time', 'overdue_tasks', 'properties_covered']),
              grouping: JSON.stringify(['role']),
              sorting: JSON.stringify([{ column: 'tasks_completed', direction: 'desc' }]),
              is_system: true
            },
            
            // Compliance & Risk Reports
            {
              name: 'Compliance Status Report',
              description: 'Track inspection results and compliance violations across properties',
              report_type: 'compliance',
              filters: JSON.stringify({
                date_range: 'monthly',
                categories: ['compliance', 'checklist'],
                include_violations: true
              }),
              columns: JSON.stringify(['property', 'last_inspection', 'inspection_result', 'open_violations', 'days_to_next_inspection', 'risk_level']),
              grouping: JSON.stringify(['property_type', 'risk_level']),
              sorting: JSON.stringify([{ column: 'risk_level', direction: 'desc' }, { column: 'open_violations', direction: 'desc' }]),
              is_system: true
            },
            {
              name: 'Emergency Response Report',
              description: 'Track emergency maintenance and critical alerts response times',
              report_type: 'security',
              filters: JSON.stringify({
                date_range: 'monthly',
                categories: ['video', 'maintenance'],
                urgency_levels: ['emergency', 'urgent']
              }),
              columns: JSON.stringify(['incident_date', 'property', 'incident_type', 'response_time', 'resolution_time', 'cost', 'preventable']),
              grouping: JSON.stringify(['incident_type']),
              sorting: JSON.stringify([{ column: 'incident_date', direction: 'desc' }]),
              is_system: true
            },
            
            // Financial Impact Reports
            {
              name: 'Maintenance Cost Analysis',
              description: 'Track maintenance costs and identify cost-saving opportunities',
              report_type: 'performance',
              filters: JSON.stringify({
                date_range: 'monthly',
                categories: ['maintenance'],
                include_costs: true
              }),
              columns: JSON.stringify(['property', 'routine_costs', 'emergency_costs', 'preventive_savings', 'vendor_costs', 'cost_trend']),
              grouping: JSON.stringify(['property', 'maintenance_type']),
              sorting: JSON.stringify([{ column: 'emergency_costs', direction: 'desc' }]),
              is_system: true
            },
            
            // Owner/Executive Reports
            {
              name: 'Executive Summary Report',
              description: 'High-level overview for property owners and executives',
              report_type: 'activity',
              filters: JSON.stringify({
                date_range: 'monthly',
                executive_summary: true
              }),
              columns: JSON.stringify(['property', 'occupancy_rate', 'compliance_score', 'maintenance_costs', 'incidents', 'tenant_satisfaction']),
              grouping: JSON.stringify(['property_type']),
              sorting: JSON.stringify([{ column: 'property', direction: 'asc' }]),
              is_system: true
            },
            
            // Video Analytics Reports
            {
              name: 'Security Alert Analysis',
              description: 'Analyze video alerts patterns and false positive rates',
              report_type: 'security',
              filters: JSON.stringify({
                date_range: 'weekly',
                categories: ['video'],
                include_false_positives: true
              }),
              columns: JSON.stringify(['property', 'camera_location', 'total_alerts', 'verified_incidents', 'false_positives', 'response_actions']),
              grouping: JSON.stringify(['property', 'alert_type']),
              sorting: JSON.stringify([{ column: 'total_alerts', direction: 'desc' }]),
              is_system: true
            },
            
            // Predictive Maintenance Report
            {
              name: 'Upcoming Maintenance Forecast',
              description: 'Predict and plan for upcoming maintenance needs',
              report_type: 'performance',
              filters: JSON.stringify({
                date_range: 'next_30_days',
                categories: ['maintenance', 'compliance'],
                predictive: true
              }),
              columns: JSON.stringify(['property', 'equipment', 'last_service', 'next_service_due', 'estimated_cost', 'priority']),
              grouping: JSON.stringify(['property', 'urgency']),
              sorting: JSON.stringify([{ column: 'next_service_due', direction: 'asc' }]),
              is_system: true
            }
          ]);
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
    .dropTableIfExists('operational_metrics')
    .dropTableIfExists('audit_context')
    .dropTableIfExists('audit_metrics')
    .dropTableIfExists('audit_generated_reports')
    .dropTableIfExists('audit_scheduled_reports')
    .dropTableIfExists('audit_report_templates')
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('audit_event_types');
};
