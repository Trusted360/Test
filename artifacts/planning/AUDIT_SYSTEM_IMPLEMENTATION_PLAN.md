# Audit System Implementation Plan - June 19, 2025

## Overview

The audit system database schema exists but is completely disconnected from the application. This plan provides a step-by-step approach to implement a fully functional audit and reporting system.

## Implementation Phases

### Phase 1: Core Audit Service (2-3 days)

#### 1.1 Create Audit Service
**File**: `src/api/src/services/audit.service.js`

```javascript
const logger = require('../utils/logger');

class AuditService {
  constructor(knex) {
    this.knex = knex;
  }

  async logEvent(category, action, context = {}) {
    const trx = await this.knex.transaction();
    
    try {
      // Get event type
      const eventType = await trx('audit_event_types')
        .where({ category, action })
        .first();
      
      if (!eventType) {
        logger.warn(`Unknown audit event type: ${category}.${action}`);
        await trx.rollback();
        return;
      }

      // Create audit log entry
      const [auditLog] = await trx('audit_logs')
        .insert({
          event_type_id: eventType.id,
          user_id: context.userId,
          tenant_id: context.tenantId || 'default',
          property_id: context.propertyId,
          entity_type: context.entityType,
          entity_id: context.entityId,
          action: action,
          description: context.description || eventType.description,
          old_values: context.oldValues,
          new_values: context.newValues,
          metadata: context.metadata,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          session_id: context.sessionId,
          created_at: new Date()
        })
        .returning('*');

      // Add business context if provided
      if (context.businessContext) {
        await trx('audit_context').insert({
          audit_log_id: auditLog.id,
          cost_amount: context.businessContext.cost,
          urgency_level: context.businessContext.urgency,
          business_impact: context.businessContext.impact,
          response_time_minutes: context.businessContext.responseTime,
          resolution_time_hours: context.businessContext.resolutionTime,
          additional_context: context.businessContext.additional
        });
      }

      // Update operational metrics in real-time
      await this.updateOperationalMetrics(context);

      await trx.commit();
      return auditLog;
    } catch (error) {
      await trx.rollback();
      logger.error('Failed to log audit event:', error);
      throw error;
    }
  }

  async updateOperationalMetrics(context) {
    // Implementation for real-time metric updates
    // This will be called after each audit event to keep metrics current
  }

  async getAuditLogs(filters = {}) {
    // Query audit logs with filters
  }

  async generateReport(templateId, dateRange, filters = {}) {
    // Generate report based on template
  }
}

module.exports = AuditService;
```

#### 1.2 Update Service Index
**File**: `src/api/src/services/index.js`
```javascript
// Add to existing exports
const AuditService = require('./audit.service');

module.exports = {
  // ... existing services
  AuditService
};
```

### Phase 2: Service Integration (3-4 days)

#### 2.1 Checklist Service Integration
**File**: `src/api/src/services/checklist.service.js`

Add audit logging to key methods:

```javascript
// In constructor
constructor(knex, auditService) {
  this.knex = knex;
  this.auditService = auditService;
}

// In createChecklist method
async createChecklist(checklistData, tenantId) {
  // ... existing code ...
  
  // After successful creation
  await this.auditService.logEvent('checklist', 'created', {
    userId: checklistData.created_by,
    tenantId: tenantId,
    propertyId: property_id,
    entityType: 'checklist',
    entityId: checklist.id,
    metadata: {
      template_id: template_id,
      assigned_to: assigned_to,
      due_date: due_date
    }
  });
  
  return checklist;
}

// In completeItem method
async completeItem(checklistId, itemId, responseData, userId, tenantId) {
  // ... existing code ...
  
  // After successful completion
  await this.auditService.logEvent('checklist', 'item_completed', {
    userId: userId,
    tenantId: tenantId,
    propertyId: checklist.property_id,
    entityType: 'checklist_item',
    entityId: itemId,
    metadata: {
      checklist_id: checklistId,
      response_value: response_value,
      requires_approval: requires_approval
    }
  });
}

// In updateChecklistStatus method
async updateChecklistStatus(id, status, tenantId) {
  // ... existing code ...
  
  // Log status change
  await this.auditService.logEvent('checklist', 
    status === 'completed' ? 'completed' : 'status_changed', {
    userId: req.user?.id, // Need to pass this in
    tenantId: tenantId,
    propertyId: checklist.property_id,
    entityType: 'checklist',
    entityId: id,
    oldValues: { status: checklist.status },
    newValues: { status: status }
  });
}
```

#### 2.2 Video Analysis Service Integration
**File**: `src/api/src/services/videoAnalysis.service.js`

```javascript
// Add audit logging for:
// - Alert triggered
// - Alert acknowledged
// - Alert resolved
// - Checklist generated from alert
// - False positive marked
```

#### 2.3 Auth Service Integration
**File**: `src/api/src/services/auth.service.js`

```javascript
// Add audit logging for:
// - User login
// - User logout
// - Failed login attempts
// - Password changes
// - Role changes
```

### Phase 3: Middleware Enhancement (1-2 days)

#### 3.1 Audit Middleware
**File**: `src/api/src/middleware/auditMiddleware.js`

```javascript
const AuditService = require('../services/audit.service');

const auditMiddleware = (auditService) => {
  return (req, res, next) => {
    // Capture request context
    req.auditContext = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.session?.id,
      userId: req.user?.id,
      tenantId: req.user?.tenant_id || 'default'
    };

    // Inject audit service
    req.auditService = auditService;

    next();
  };
};

module.exports = auditMiddleware;
```

### Phase 4: API Endpoints (2-3 days)

#### 4.1 Audit Controller
**File**: `src/api/src/controllers/audit.controller.js`

```javascript
class AuditController {
  constructor(auditService) {
    this.auditService = auditService;
  }

  async getAuditLogs(req, res) {
    try {
      const { startDate, endDate, category, userId, propertyId } = req.query;
      const logs = await this.auditService.getAuditLogs({
        tenantId: req.user.tenant_id,
        startDate,
        endDate,
        category,
        userId,
        propertyId
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getReports(req, res) {
    // Get available reports
  }

  async generateReport(req, res) {
    // Generate a new report
  }

  async getMetrics(req, res) {
    // Get operational metrics
  }
}

module.exports = AuditController;
```

#### 4.2 Audit Routes
**File**: `src/api/routes/audit.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

module.exports = (auditController) => {
  router.use(authenticate);

  router.get('/logs', auditController.getAuditLogs.bind(auditController));
  router.get('/reports', auditController.getReports.bind(auditController));
  router.post('/reports/generate', auditController.generateReport.bind(auditController));
  router.get('/metrics', auditController.getMetrics.bind(auditController));
  router.get('/metrics/:propertyId', auditController.getPropertyMetrics.bind(auditController));

  return router;
};
```

### Phase 5: Report Generation Service (3-4 days)

#### 5.1 Report Service
**File**: `src/api/src/services/report.service.js`

```javascript
class ReportService {
  constructor(knex, auditService) {
    this.knex = knex;
    this.auditService = auditService;
  }

  async generateReport(templateId, dateRange, filters = {}) {
    // Get template
    const template = await this.knex('audit_report_templates')
      .where('id', templateId)
      .first();

    // Query data based on template configuration
    const data = await this.queryReportData(template, dateRange, filters);

    // Format report
    const report = await this.formatReport(template, data);

    // Save generated report
    const savedReport = await this.saveReport(report);

    return savedReport;
  }

  async scheduleReport(templateId, schedule, recipients) {
    // Create scheduled report entry
  }

  async runScheduledReports() {
    // Check for due reports and generate them
  }
}

module.exports = ReportService;
```

### Phase 6: Metrics Calculation Job (2-3 days)

#### 6.1 Metrics Calculator
**File**: `src/api/src/jobs/metricsCalculator.js`

```javascript
class MetricsCalculator {
  constructor(knex) {
    this.knex = knex;
  }

  async calculateDailyMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all properties
    const properties = await this.knex('properties')
      .where('is_active', true);

    for (const property of properties) {
      await this.calculatePropertyMetrics(property.id, today);
    }
  }

  async calculatePropertyMetrics(propertyId, date) {
    const metrics = {
      property_id: propertyId,
      metric_date: date,
      
      // Response metrics
      avg_alert_response_minutes: await this.calculateAvgAlertResponse(propertyId, date),
      avg_work_order_hours: await this.calculateAvgWorkOrderTime(propertyId, date),
      
      // Compliance metrics
      inspections_completed: await this.countInspections(propertyId, date, 'completed'),
      violations_found: await this.countViolations(propertyId, date, 'found'),
      
      // Task metrics
      tasks_completed: await this.countTasks(propertyId, date, 'completed'),
      checklists_completed: await this.countChecklists(propertyId, date, 'completed'),
      
      // Video analytics
      alerts_triggered: await this.countAlerts(propertyId, date, 'triggered'),
      false_positives: await this.countAlerts(propertyId, date, 'false_positive')
    };

    // Upsert metrics
    await this.knex('operational_metrics')
      .insert(metrics)
      .onConflict(['property_id', 'tenant_id', 'metric_date'])
      .merge();
  }
}

module.exports = MetricsCalculator;
```

### Phase 7: Frontend Implementation (4-5 days)

#### 7.1 Audit Dashboard Page
**File**: `src/dashboard/src/pages/Audit/index.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { auditService } from '@services/audit.service';

const AuditDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const [metricsData, activityData] = await Promise.all([
      auditService.getMetrics(),
      auditService.getRecentActivity()
    ]);
    
    setMetrics(metricsData);
    setRecentActivity(activityData);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Audit & Reporting Dashboard
      </Typography>
      
      {/* Metrics Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <MetricCard 
            title="Tasks Completed Today"
            value={metrics?.tasksCompletedToday || 0}
          />
        </Grid>
        {/* More metric cards... */}
      </Grid>

      {/* Activity Feed */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <ActivityFeed activities={recentActivity} />
      </Paper>
    </Box>
  );
};

export default AuditDashboard;
```

#### 7.2 Reports Page
**File**: `src/dashboard/src/pages/Reports/index.tsx`

```typescript
// Report generation and viewing interface
```

#### 7.3 Audit Service (Frontend)
**File**: `src/dashboard/src/services/audit.service.ts`

```typescript
import api from './api';

export const auditService = {
  async getAuditLogs(filters: any) {
    const response = await api.get('/audit/logs', { params: filters });
    return response.data;
  },

  async getMetrics() {
    const response = await api.get('/audit/metrics');
    return response.data;
  },

  async generateReport(templateId: number, params: any) {
    const response = await api.post('/audit/reports/generate', {
      templateId,
      ...params
    });
    return response.data;
  },

  async getReports() {
    const response = await api.get('/audit/reports');
    return response.data;
  }
};
```

## Testing Strategy

### Unit Tests
- Test audit service methods
- Test report generation logic
- Test metrics calculations

### Integration Tests
- Test audit logging from services
- Test report generation end-to-end
- Test metrics aggregation

### E2E Tests
- Test audit dashboard functionality
- Test report generation UI
- Test activity tracking

## Deployment Considerations

### Database Performance
- Add indexes for audit queries
- Consider partitioning audit_logs table by date
- Implement data retention policies

### Monitoring
- Monitor audit service performance
- Track failed audit log attempts
- Alert on missing metrics

### Security
- Ensure audit logs are immutable
- Implement access controls for sensitive reports
- Encrypt PII in audit logs

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Core Audit Service | 2-3 days | None |
| Phase 2: Service Integration | 3-4 days | Phase 1 |
| Phase 3: Middleware | 1-2 days | Phase 1 |
| Phase 4: API Endpoints | 2-3 days | Phase 1 |
| Phase 5: Report Service | 3-4 days | Phase 1, 4 |
| Phase 6: Metrics Job | 2-3 days | Phase 1 |
| Phase 7: Frontend | 4-5 days | Phase 4, 5 |

**Total Timeline: 17-24 days**

## Success Criteria

1. All user actions are logged to audit tables
2. Daily operational metrics are calculated automatically
3. Reports can be generated from templates
4. Frontend displays audit data and metrics
5. Property managers can track compliance and costs
6. System performance remains acceptable with audit logging

## Next Steps

1. Create the audit service implementation
2. Start integrating with checklist service (highest value)
3. Build basic API endpoints for testing
4. Implement metrics calculation job
5. Create frontend dashboard

This implementation will transform the audit system from a set of empty tables into a fully functional reporting and analytics platform that provides real value to property managers.
