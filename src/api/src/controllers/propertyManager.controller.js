const propertyManagerService = require('../services/propertyManager.service');
const { knex } = require('../database');
const AuditService = require('../services/audit.service');
const auditService = new AuditService(knex);

class PropertyManagerController {
  /**
   * Get property health dashboard
   * GET /api/property-manager/dashboard
   */
  async getDashboard(req, res, next) {
    try {
      const tenantId = req.user.tenant_id;
      const { dateRange, propertyId } = req.query;
      
      const dashboard = await propertyManagerService.getPropertyHealthDashboard(
        tenantId, 
        { dateRange, propertyId }
      );
      
      await auditService.logEvent('property', 'view_dashboard', {
        userId: req.user.id,
        entityType: 'property_manager',
        entityId: propertyId || 'all',
        description: 'Viewed property manager dashboard',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        tenantId: tenantId
      });
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get checklist completion report
   * GET /api/property-manager/reports/checklist-completions
   */
  async getChecklistCompletions(req, res, next) {
    try {
      const tenantId = req.user.tenant_id;
      const { 
        startDate, 
        endDate, 
        propertyId, 
        includePhotos = true 
      } = req.query;
      
      const report = await propertyManagerService.getChecklistCompletionReport(
        tenantId,
        {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          propertyId,
          includePhotos: includePhotos === 'true'
        }
      );
      
      await auditService.logEvent('checklist', 'generate_report', {
        userId: req.user.id,
        entityType: 'checklist_completion',
        description: 'Generated checklist completion report',
        metadata: { startDate, endDate, propertyId },
        tenantId: tenantId
      });
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get action items report
   * GET /api/property-manager/reports/action-items
   */
  async getActionItems(req, res, next) {
    try {
      const tenantId = req.user.tenant_id;
      const { 
        status, 
        severity, 
        assignedTo, 
        propertyId, 
        overdue 
      } = req.query;
      
      const report = await propertyManagerService.getActionItemsReport(
        tenantId,
        {
          status,
          severity,
          assignedTo: assignedTo ? parseInt(assignedTo) : null,
          propertyId: propertyId ? parseInt(propertyId) : null,
          overdue: overdue === 'true'
        }
      );
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or update action item
   * POST /api/property-manager/action-items
   */
  async createActionItem(req, res, next) {
    try {
      const tenantId = req.user.tenant_id;
      const actionItemData = {
        ...req.body,
        updated_by: req.user.id
      };
      
      const actionItem = await propertyManagerService.createActionItem(
        tenantId,
        actionItemData
      );
      
      await auditService.logEvent('property', actionItemData.id ? 'update' : 'create', {
        userId: req.user.id,
        entityType: 'action_item',
        entityId: actionItem.id,
        description: `${actionItemData.id ? 'Updated' : 'Created'} action item: ${actionItem.title}`,
        newValues: actionItem,
        tenantId: tenantId
      });
      
      res.json({
        success: true,
        data: actionItem
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add update to action item
   * POST /api/property-manager/action-items/:id/updates
   */
  async addActionItemUpdate(req, res, next) {
    try {
      const tenantId = req.user.tenant_id;
      const actionItemId = parseInt(req.params.id);
      const update = {
        ...req.body,
        updated_by: req.user.id
      };
      
      await propertyManagerService.addActionItemUpdate(
        tenantId,
        actionItemId,
        update
      );
      
      res.json({
        success: true,
        message: 'Update added successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get staff performance report
   * GET /api/property-manager/reports/staff-performance
   */
  async getStaffPerformance(req, res, next) {
    try {
      const tenantId = req.user.tenant_id;
      const { startDate, endDate } = req.query;
      
      const report = await propertyManagerService.getStaffPerformanceReport(
        tenantId,
        {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined
        }
      );
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recurring issues report
   * GET /api/property-manager/reports/recurring-issues
   */
  async getRecurringIssues(req, res, next) {
    try {
      const tenantId = req.user.tenant_id;
      const { propertyId } = req.query;
      
      const report = await propertyManagerService.getRecurringIssuesReport(
        tenantId,
        propertyId ? parseInt(propertyId) : null
      );
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get property inspection summary
   * GET /api/property-manager/properties/:id/inspection-summary
   */
  async getPropertyInspectionSummary(req, res, next) {
    try {
      const tenantId = req.user.tenant_id;
      const propertyId = parseInt(req.params.id);
      const { days = 30 } = req.query;
      
      const summary = await propertyManagerService.getPropertyInspectionSummary(
        tenantId,
        propertyId,
        parseInt(days)
      );
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export report as CSV/PDF
   * GET /api/property-manager/reports/export
   */
  async exportReport(req, res, next) {
    try {
      const { reportType, format = 'csv', ...params } = req.query;
      
      // This would integrate with a reporting library
      // For now, return a message
      res.json({
        success: true,
        message: `Export functionality for ${reportType} in ${format} format will be implemented`,
        params
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get comprehensive property audit data
   * GET /api/property-manager/property-audits
   */
  async getPropertyAuditData(req, res, next) {
    try {
      const tenantId = req.user.tenant_id;
      const { 
        startDate,
        endDate,
        propertyId,
        status,
        assignedTo
      } = req.query;
      
      const auditData = await propertyManagerService.getPropertyAuditData(
        tenantId,
        {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          propertyId: propertyId ? parseInt(propertyId) : null,
          status,
          assignedTo: assignedTo ? parseInt(assignedTo) : null
        }
      );
      
      await auditService.logEvent('checklist', 'view_property_audits', {
        userId: req.user.id,
        entityType: 'property_audit',
        description: 'Viewed property audit data',
        metadata: { startDate, endDate, propertyId, status },
        tenantId: tenantId
      });
      
      res.json({
        success: true,
        data: auditData
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PropertyManagerController();