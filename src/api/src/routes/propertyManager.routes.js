const express = require('express');
const propertyManagerController = require('../controllers/propertyManager.controller');

module.exports = (services) => {
  const router = express.Router();

  // Dashboard - available to all authenticated users
  router.get('/dashboard', propertyManagerController.getDashboard);

  // Reports - available to all authenticated users for now
  router.get('/reports/checklist-completions', 
    propertyManagerController.getChecklistCompletions
  );

  router.get('/reports/action-items', 
    propertyManagerController.getActionItems
  );

  router.get('/reports/staff-performance', 
    propertyManagerController.getStaffPerformance
  );

  router.get('/reports/recurring-issues', 
    propertyManagerController.getRecurringIssues
  );

  router.get('/reports/export', 
    propertyManagerController.exportReport
  );

  // Action items management
  router.post('/action-items', 
    propertyManagerController.createActionItem
  );

  router.post('/action-items/:id/updates', 
    propertyManagerController.addActionItemUpdate
  );

  // Property-specific summaries
  router.get('/properties/:id/inspection-summary', 
    propertyManagerController.getPropertyInspectionSummary
  );

  // Property audit data endpoint
  router.get('/property-audits',
    propertyManagerController.getPropertyAuditData
  );

  return router;
};