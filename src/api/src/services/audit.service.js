const logger = require('../utils/logger');

class AuditService {
  constructor(knex) {
    this.knex = knex;
    logger.info('AuditService initialized');
  }

  /**
   * Log an audit event with full context
   * @param {string} category - Event category (checklist, user, video, etc.)
   * @param {string} action - Specific action (created, completed, login, etc.)
   * @param {Object} context - Event context and metadata
   */
  async logEvent(category, action, context = {}) {
    logger.info(`AuditService.logEvent called: ${category}.${action}`, {
      userId: context.userId,
      entityType: context.entityType,
      entityId: context.entityId
    });

    const trx = await this.knex.transaction();
    
    try {
      // Get event type
      const eventType = await trx('audit_event_types')
        .where({ category, action })
        .first();
      
      if (!eventType) {
        logger.warn(`Unknown audit event type: ${category}.${action}`);
        await trx.rollback();
        return null;
      }

      // Create audit log entry
      const [auditLog] = await trx('audit_logs')
        .insert({
          event_type_id: eventType.id,
          user_id: context.userId || null,
          tenant_id: context.tenantId || 'default',
          property_id: context.propertyId || null,
          entity_type: context.entityType || null,
          entity_id: context.entityId || null,
          action: action,
          description: context.description || eventType.description,
          old_values: context.oldValues ? JSON.stringify(context.oldValues) : null,
          new_values: context.newValues ? JSON.stringify(context.newValues) : null,
          metadata: context.metadata ? JSON.stringify(context.metadata) : null,
          ip_address: context.ipAddress || null,
          user_agent: context.userAgent || null,
          session_id: context.sessionId || null,
          created_at: new Date()
        })
        .returning('*');

      // Add business context if provided
      if (context.businessContext) {
        await trx('audit_context').insert({
          audit_log_id: auditLog.id,
          cost_amount: context.businessContext.cost || null,
          urgency_level: context.businessContext.urgency || 'medium',
          business_impact: context.businessContext.impact || null,
          response_time_minutes: context.businessContext.responseTime || null,
          resolution_time_hours: context.businessContext.resolutionTime || null,
          additional_context: context.businessContext.additional ? JSON.stringify(context.businessContext.additional) : null
        });
      }

      // Update operational metrics in real-time
      await this.updateOperationalMetrics(context, trx);

      await trx.commit();
      
      logger.info(`Audit event logged successfully: ${category}.${action}`, {
        auditLogId: auditLog.id,
        userId: context.userId,
        entityType: context.entityType,
        entityId: context.entityId
      });

      return auditLog;
    } catch (error) {
      await trx.rollback();
      logger.error('Failed to log audit event:', {
        category,
        action,
        error: error.message,
        stack: error.stack
      });
      // Don't throw - audit logging should not break main functionality
      return null;
    }
  }

  /**
   * Update operational metrics in real-time
   * @param {Object} context - Event context
   * @param {Object} trx - Database transaction
   */
  async updateOperationalMetrics(context, trx) {
    try {
      if (!context.propertyId) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if metrics record exists for today
      const existingMetrics = await trx('operational_metrics')
        .where({
          property_id: context.propertyId,
          tenant_id: context.tenantId || 'default',
          metric_date: today
        })
        .first();

      if (!existingMetrics) {
        // Create new metrics record
        await trx('operational_metrics').insert({
          property_id: context.propertyId,
          tenant_id: context.tenantId || 'default',
          metric_date: today,
          tasks_completed: 0,
          checklists_completed: 0,
          inspections_completed: 0,
          violations_found: 0,
          alerts_triggered: 0,
          false_positives: 0,
          avg_alert_response_minutes: 0,
          avg_work_order_hours: 0
        });
      }

      // Update specific metrics based on event type
      const updates = {};
      
      if (context.entityType === 'checklist' && context.action === 'completed') {
        updates.checklists_completed = trx.raw('checklists_completed + 1');
      }
      
      if (context.entityType === 'checklist_item' && context.action === 'completed') {
        updates.tasks_completed = trx.raw('tasks_completed + 1');
      }
      
      if (context.entityType === 'alert' && context.action === 'triggered') {
        updates.alerts_triggered = trx.raw('alerts_triggered + 1');
      }
      
      if (context.entityType === 'alert' && context.action === 'false_positive') {
        updates.false_positives = trx.raw('false_positives + 1');
      }

      if (Object.keys(updates).length > 0) { // If there are any updates
        await trx('operational_metrics')
          .where({
            property_id: context.propertyId,
            tenant_id: context.tenantId || 'default',
            metric_date: today
          })
          .update(updates);
      }
    } catch (error) {
      logger.error('Failed to update operational metrics:', error);
      // Don't throw - metrics update failure shouldn't break audit logging
    }
  }

  /**
   * Get audit logs with filters
   * @param {Object} filters - Query filters
   */
  async getAuditLogs(filters = {}) {
    try {
      let query = this.knex('audit_logs as al')
        .leftJoin('audit_event_types as aet', 'al.event_type_id', 'aet.id')
        .leftJoin('audit_context as ac', 'al.id', 'ac.audit_log_id')
        .leftJoin('users as u', 'al.user_id', 'u.id')
        .select(
          'al.*',
          'aet.category',
          'aet.description as event_description',
          'ac.cost_amount',
          'ac.urgency_level',
          'ac.business_impact',
          'ac.response_time_minutes',
          'ac.resolution_time_hours',
          'u.first_name',
          'u.last_name',
          'u.email'
        );

      // Apply filters
      if (filters.tenantId) {
        query = query.where('al.tenant_id', filters.tenantId);
      }
      
      if (filters.propertyId) {
        query = query.where('al.property_id', filters.propertyId);
      }
      
      if (filters.userId) {
        query = query.where('al.user_id', filters.userId);
      }
      
      if (filters.category) {
        query = query.where('aet.category', filters.category);
      }
      
      if (filters.entityType) {
        query = query.where('al.entity_type', filters.entityType);
      }
      
      if (filters.startDate) {
        query = query.where('al.created_at', '>=', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.where('al.created_at', '<=', filters.endDate);
      }

      // Order by most recent first
      query = query.orderBy('al.created_at', 'desc');

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const logs = await query;
      
      // Parse JSON fields safely
      return logs.map(log => ({
        ...log,
        old_values: log.old_values && typeof log.old_values === 'string' ? JSON.parse(log.old_values) : log.old_values,
        new_values: log.new_values && typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values,
        metadata: log.metadata && typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
      }));
    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get operational metrics for a property
   * @param {number} propertyId - Property ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} dateRange - Date range for metrics
   */
  async getOperationalMetrics(propertyId, tenantId = 'default', dateRange = {}) {
    try {
      let query = this.knex('operational_metrics')
        .where({ property_id: propertyId, tenant_id: tenantId });

      if (dateRange.startDate) {
        query = query.where('metric_date', '>=', dateRange.startDate);
      }
      
      if (dateRange.endDate) {
        query = query.where('metric_date', '<=', dateRange.endDate);
      }

      return await query.orderBy('metric_date', 'desc');
    } catch (error) {
      logger.error('Failed to get operational metrics:', error);
      throw error;
    }
  }

  /**
   * Get recent activity for dashboard
   * @param {Object} filters - Query filters
   */
  async getRecentActivity(filters = {}) {
    try {
      const recentLogs = await this.getAuditLogs({
        ...filters,
        limit: 50,
        offset: 0
      });

      return recentLogs.map(log => ({
        id: log.id,
        timestamp: log.created_at,
        category: log.category,
        action: log.action,
        description: log.description,
        user: log.first_name && log.last_name ? `${log.first_name} ${log.last_name}` : log.email || 'System',
        entityType: log.entity_type,
        entityId: log.entity_id,
        urgency: log.urgency_level,
        cost: log.cost_amount
      }));
    } catch (error) {
      logger.error('Failed to get recent activity:', error);
      throw error;
    }
  }

  /**
   * Generate a report based on template
   * @param {number} templateId - Report template ID
   * @param {Object} dateRange - Date range for report
   * @param {Object} filters - Additional filters
   */
  async generateReport(templateId, dateRange, filters = {}) {
    try {
      // Get template
      const template = await this.knex('audit_report_templates')
        .where('id', templateId)
        .first();

      if (!template) {
        throw new Error(`Report template ${templateId} not found`);
      }

      // Parse template configuration
      const config = JSON.parse(template.configuration);
      
      // Query data based on template configuration
      const data = await this.queryReportData(config, dateRange, filters);

      // Format report
      const report = {
        id: Date.now(), // Temporary ID
        template_id: templateId,
        title: template.name,
        description: template.description,
        generated_at: new Date(),
        date_range: dateRange,
        filters: filters,
        data: data,
        summary: this.generateReportSummary(data, config)
      };

      // Save generated report
      const [savedReport] = await this.knex('audit_generated_reports')
        .insert({
          template_id: templateId,
          tenant_id: filters.tenantId || 'default',
          property_id: filters.propertyId || null,
          generated_by: filters.userId || null,
          report_data: JSON.stringify(report),
          date_range_start: dateRange.startDate,
          date_range_end: dateRange.endDate,
          created_at: new Date()
        })
        .returning('*');

      return {
        ...report,
        id: savedReport.id
      };
    } catch (error) {
      logger.error('Failed to generate report:', error);
      throw error;
    }
  }

  /**
   * Query data for report generation
   * @param {Object} config - Template configuration
   * @param {Object} dateRange - Date range
   * @param {Object} filters - Filters
   */
  async queryReportData(config, dateRange, filters) {
    // This is a simplified implementation
    // In a full implementation, this would parse the config and build complex queries
    const logs = await this.getAuditLogs({
      ...filters,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      limit: 1000
    });

    return {
      totalEvents: logs.length,
      eventsByCategory: this.groupBy(logs, 'category'),
      eventsByDay: this.groupByDay(logs),
      topUsers: this.getTopUsers(logs),
      criticalEvents: logs.filter(log => log.urgency_level === 'high')
    };
  }

  /**
   * Generate report summary
   * @param {Object} data - Report data
   * @param {Object} config - Template configuration
   */
  generateReportSummary(data, config) {
    return {
      totalEvents: data.totalEvents,
      criticalEvents: data.criticalEvents.length,
      mostActiveDay: this.getMostActiveDay(data.eventsByDay),
      topCategory: this.getTopCategory(data.eventsByCategory)
    };
  }

  // Helper methods
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key] || 'unknown';
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }

  groupByDay(logs) {
    return logs.reduce((result, log) => {
      const day = new Date(log.created_at).toISOString().split('T')[0];
      result[day] = (result[day] || 0) + 1;
      return result;
    }, {});
  }

  getTopUsers(logs) {
    const userCounts = logs.reduce((result, log) => {
      const user = log.first_name && log.last_name ? `${log.first_name} ${log.last_name}` : log.email || 'System';
      result[user] = (result[user] || 0) + 1;
      return result;
    }, {});
    return Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([user, count]) => ({ user, count }));
  }

  getMostActiveDay(eventsByDay) {
    const entries = Object.entries(eventsByDay);
    if (entries.length === 0) return null;
    return entries.reduce((max, current) => current[1] > max[1] ? current : max)[0];
  }

  getTopCategory(eventsByCategory) {
    const entries = Object.entries(eventsByCategory);
    if (entries.length === 0) return null;
    return entries.reduce((max, current) => current[1] > max[1] ? current : max)[0];
  }
}

module.exports = AuditService;
