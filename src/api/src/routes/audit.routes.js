const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/audit.controller');

module.exports = (services) => {
  const auditController = new AuditController(services.AuditService);

  // Audit logs endpoints
  router.get('/logs', auditController.getAuditLogs.bind(auditController));
  router.get('/activity', auditController.getRecentActivity.bind(auditController));
  router.get('/statistics', auditController.getAuditStatistics.bind(auditController));

  // Metrics endpoints
  router.get('/metrics', auditController.getOperationalMetrics.bind(auditController));
  router.get('/metrics/:propertyId', auditController.getOperationalMetrics.bind(auditController));

  // Report endpoints
  router.get('/reports/templates', auditController.getReportTemplates.bind(auditController));
  router.post('/reports/generate', auditController.generateReport.bind(auditController));
  router.get('/reports', auditController.getGeneratedReports.bind(auditController));
  router.get('/reports/:reportId', auditController.getGeneratedReport.bind(auditController));

  return router;
};
