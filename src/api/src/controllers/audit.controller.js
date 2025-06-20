const logger = require('../utils/logger');

class AuditController {
  constructor(auditService) {
    this.auditService = auditService;
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(req, res) {
    try {
      const {
        startDate,
        endDate,
        category,
        userId,
        propertyId,
        entityType,
        limit = 50,
        offset = 0
      } = req.query;

      const filters = {
        tenantId: req.user?.tenant_id || 'default',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        category,
        userId: userId ? parseInt(userId) : undefined,
        propertyId: propertyId ? parseInt(propertyId) : undefined,
        entityType,
        limit: Math.min(parseInt(limit), 1000), // Cap at 1000 records
        offset: parseInt(offset)
      };

      const logs = await this.auditService.getAuditLogs(filters);

      res.json({
        success: true,
        data: logs,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: logs.length === filters.limit
        }
      });
    } catch (error) {
      logger.error('Failed to get audit logs:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs',
        message: error.message
      });
    }
  }

  /**
   * Get recent activity for dashboard
   */
  async getRecentActivity(req, res) {
    try {
      const { propertyId, limit = 20 } = req.query;

      const filters = {
        tenantId: req.user?.tenant_id || 'default',
        propertyId: propertyId ? parseInt(propertyId) : undefined,
        limit: Math.min(parseInt(limit), 100)
      };

      const activity = await this.auditService.getRecentActivity(filters);

      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      logger.error('Failed to get recent activity:', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve recent activity',
        message: error.message
      });
    }
  }

  /**
   * Get operational metrics for a property
   */
  async getOperationalMetrics(req, res) {
    try {
      const { propertyId } = req.params;
      const { startDate, endDate } = req.query;

      if (!propertyId) {
        return res.status(400).json({
          success: false,
          error: 'Property ID is required'
        });
      }

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const metrics = await this.auditService.getOperationalMetrics(
        parseInt(propertyId),
        req.user?.tenant_id || 'default',
        dateRange
      );

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get operational metrics:', {
        error: error.message,
        propertyId: req.params.propertyId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve operational metrics',
        message: error.message
      });
    }
  }

  /**
   * Get available report templates
   */
  async getReportTemplates(req, res) {
    try {
      const templates = await this.auditService.knex('audit_report_templates')
        .where('is_active', true)
        .select('id', 'name', 'description', 'report_type', 'created_at')
        .orderBy('report_type', 'name');

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Failed to get report templates:', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve report templates',
        message: error.message
      });
    }
  }

  /**
   * Generate a report
   */
  async generateReport(req, res) {
    try {
      const { templateId, startDate, endDate, propertyId } = req.body;

      if (!templateId || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Template ID, start date, and end date are required'
        });
      }

      const dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };

      const filters = {
        tenantId: req.user?.tenant_id || 'default',
        propertyId: propertyId ? parseInt(propertyId) : undefined,
        userId: req.user?.id
      };

      const report = await this.auditService.generateReport(
        parseInt(templateId),
        dateRange,
        filters
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Failed to generate report:', {
        error: error.message,
        templateId: req.body.templateId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        message: error.message
      });
    }
  }

  /**
   * Get generated reports
   */
  async getGeneratedReports(req, res) {
    try {
      const { propertyId, limit = 20, offset = 0 } = req.query;

      let query = this.auditService.knex('audit_generated_reports as agr')
        .leftJoin('audit_report_templates as art', 'agr.template_id', 'art.id')
        .leftJoin('users as u', 'agr.generated_by', 'u.id')
        .where('agr.tenant_id', req.user?.tenant_id || 'default')
        .select(
          'agr.id',
          'agr.template_id',
          'art.name as template_name',
          'art.description as template_description',
          'agr.date_range_start',
          'agr.date_range_end',
          'agr.created_at',
          'u.first_name',
          'u.last_name',
          'u.email'
        );

      if (propertyId) {
        query = query.where('agr.property_id', parseInt(propertyId));
      }

      const reports = await query
        .orderBy('agr.created_at', 'desc')
        .limit(Math.min(parseInt(limit), 100))
        .offset(parseInt(offset));

      res.json({
        success: true,
        data: reports,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: reports.length === parseInt(limit)
        }
      });
    } catch (error) {
      logger.error('Failed to get generated reports:', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve generated reports',
        message: error.message
      });
    }
  }

  /**
   * Get a specific generated report
   */
  async getGeneratedReport(req, res) {
    try {
      const { reportId } = req.params;

      const report = await this.auditService.knex('audit_generated_reports')
        .where({
          id: parseInt(reportId),
          tenant_id: req.user?.tenant_id || 'default'
        })
        .first();

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Parse report data
      const reportData = JSON.parse(report.report_data);

      res.json({
        success: true,
        data: {
          ...report,
          report_data: reportData
        }
      });
    } catch (error) {
      logger.error('Failed to get generated report:', {
        error: error.message,
        reportId: req.params.reportId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve report',
        message: error.message
      });
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  async getAuditStatistics(req, res) {
    try {
      const { propertyId, days = 7 } = req.query;
      const daysBack = Math.min(parseInt(days), 90); // Cap at 90 days

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const filters = {
        tenantId: req.user?.tenant_id || 'default',
        propertyId: propertyId ? parseInt(propertyId) : undefined,
        startDate: startDate
      };

      const logs = await this.auditService.getAuditLogs({
        ...filters,
        limit: 10000 // Get enough data for statistics
      });

      // Calculate statistics
      const stats = {
        totalEvents: logs.length,
        todayEvents: logs.filter(log => {
          const logDate = new Date(log.created_at).toDateString();
          const today = new Date().toDateString();
          return logDate === today;
        }).length,
        weekEvents: logs.filter(log => {
          const logDate = new Date(log.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return logDate >= weekAgo;
        }).length,
        monthEvents: logs.filter(log => {
          const logDate = new Date(log.created_at);
          const monthAgo = new Date();
          monthAgo.setDate(monthAgo.getDate() - 30);
          return logDate >= monthAgo;
        }).length,
        topCategories: Object.entries(this.auditService.groupBy(logs, 'category'))
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topActions: Object.entries(this.auditService.groupBy(logs, 'action'))
          .map(([action, count]) => ({ action, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topUsers: this.auditService.getTopUsers(logs)
      };

      res.json({
        success: true,
        data: stats,
        dateRange: {
          startDate: startDate,
          endDate: new Date(),
          days: daysBack
        }
      });
    } catch (error) {
      logger.error('Failed to get audit statistics:', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit statistics',
        message: error.message
      });
    }
  }

  /**
   * Calculate trend data for statistics
   */
  calculateTrend(logs, days) {
    const today = new Date();
    const trend = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.created_at).toISOString().split('T')[0];
        return logDate === dateStr;
      });

      trend.push({
        date: dateStr,
        count: dayLogs.length,
        categories: this.auditService.groupBy(dayLogs, 'category')
      });
    }

    return trend;
  }
}

module.exports = AuditController;
