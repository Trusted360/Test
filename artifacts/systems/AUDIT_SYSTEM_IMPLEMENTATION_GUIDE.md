# Audit System Implementation Guide

## Overview

The Trusted360 Audit System is designed to provide comprehensive activity tracking and reporting capabilities specifically tailored for property managers. It captures all system activities, generates actionable insights, and produces meaningful reports that help property managers make better decisions.

## Key Features

### 1. Comprehensive Event Tracking
- **All Activities Logged**: Every user action, system event, and automated process is tracked
- **Contextual Information**: Each event includes relevant context like cost, urgency, and business impact
- **Property Manager Focus**: Events are categorized in ways that make sense for property management

### 2. Operational Metrics
- **Real-time Dashboards**: Key metrics calculated and stored for instant access
- **Performance Tracking**: Monitor staff productivity, response times, and completion rates
- **Financial Impact**: Track costs and identify savings opportunities

### 3. Intelligent Reporting
- **Pre-built Templates**: 9 property manager-focused report templates ready to use
- **Scheduled Reports**: Automated report generation and distribution
- **Custom Reports**: Flexible system allows creating custom reports

## Database Schema

### Core Tables

1. **audit_event_types**: Defines all possible events in the system
2. **audit_logs**: Main table storing all audit events
3. **audit_context**: Additional property manager-specific context for events
4. **operational_metrics**: Pre-calculated metrics for dashboards
5. **audit_report_templates**: Configurable report definitions
6. **audit_scheduled_reports**: Automated report scheduling
7. **audit_generated_reports**: Store generated report instances
8. **audit_metrics**: Aggregated metrics for trend analysis

## Implementation Steps

### Phase 1: Core Audit Service

Create the audit service to handle event logging:

```javascript
// src/api/services/audit.service.js
class AuditService {
  async logEvent(eventData) {
    const { category, action, userId, propertyId, entityType, entityId, description, metadata, context } = eventData;
    
    // Get event type
    const eventType = await db('audit_event_types')
      .where({ category, action })
      .first();
    
    if (!eventType) {
      throw new Error(`Unknown event type: ${category}.${action}`);
    }
    
    // Create audit log entry
    const [auditLogId] = await db('audit_logs').insert({
      event_type_id: eventType.id,
      user_id: userId,
      tenant_id: context.tenantId || 'default',
      property_id: propertyId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      description,
      metadata: JSON.stringify(metadata),
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      session_id: context.sessionId
    });
    
    // Add context if provided
    if (context.cost || context.urgency || context.businessImpact) {
      await db('audit_context').insert({
        audit_log_id: auditLogId,
        cost_amount: context.cost,
        urgency_level: context.urgency,
        business_impact: context.businessImpact,
        response_time_minutes: context.responseTime,
        resolution_time_hours: context.resolutionTime,
        additional_context: JSON.stringify(context.additional)
      });
    }
    
    return auditLogId;
  }
  
  async calculateDailyMetrics(propertyId, date) {
    // Calculate and store operational metrics
    const metrics = await this.gatherMetrics(propertyId, date);
    
    await db('operational_metrics').insert({
      property_id: propertyId,
      metric_date: date,
      ...metrics
    }).onConflict(['property_id', 'tenant_id', 'metric_date'])
      .merge();
  }
}
```

### Phase 2: Integration Points

Add audit logging to existing services:

```javascript
// Example: Checklist completion
async completeChecklist(checklistId, userId) {
  const checklist = await db('property_checklists')
    .where({ id: checklistId })
    .first();
  
  // Update checklist
  await db('property_checklists')
    .where({ id: checklistId })
    .update({
      status: 'completed',
      completed_at: new Date()
    });
  
  // Log audit event
  await auditService.logEvent({
    category: 'checklist',
    action: 'completed',
    userId,
    propertyId: checklist.property_id,
    entityType: 'checklist',
    entityId: checklistId,
    description: `Checklist "${checklist.name}" completed`,
    metadata: {
      checklist_name: checklist.name,
      completion_time: calculateCompletionTime(checklist)
    },
    context: {
      urgency: checklist.priority,
      businessImpact: 'compliance_maintained'
    }
  });
}
```

### Phase 3: Report Generation

Implement the report generation engine:

```javascript
// src/api/services/report.service.js
class ReportService {
  async generateReport(templateId, filters = {}) {
    const template = await db('audit_report_templates')
      .where({ id: templateId })
      .first();
    
    if (!template) {
      throw new Error('Report template not found');
    }
    
    const reportConfig = {
      ...JSON.parse(template.filters),
      ...filters
    };
    
    // Build query based on report type
    let query = this.buildReportQuery(template.report_type, reportConfig);
    
    // Apply grouping and sorting
    const grouping = JSON.parse(template.grouping);
    const sorting = JSON.parse(template.sorting);
    
    query = this.applyGrouping(query, grouping);
    query = this.applySorting(query, sorting);
    
    // Execute query
    const data = await query;
    
    // Generate report file
    const report = await this.formatReport(data, template);
    
    // Store generated report
    const [reportId] = await db('audit_generated_reports').insert({
      template_id: templateId,
      report_name: `${template.name} - ${new Date().toISOString()}`,
      start_date: reportConfig.startDate,
      end_date: reportConfig.endDate,
      file_path: report.filePath,
      format: report.format,
      record_count: data.length,
      filters_applied: JSON.stringify(reportConfig),
      summary_stats: JSON.stringify(report.stats),
      generated_by: filters.userId,
      tenant_id: filters.tenantId || 'default'
    });
    
    return { reportId, filePath: report.filePath };
  }
}
```

### Phase 4: Dashboard Implementation

Create dashboard endpoints for real-time metrics:

```javascript
// src/api/controllers/dashboard.controller.js
class DashboardController {
  async getPropertyOverview(req, res) {
    const { propertyId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's metrics
    const metrics = await db('operational_metrics')
      .where({
        property_id: propertyId,
        metric_date: today
      })
      .first();
    
    // Get recent alerts
    const recentAlerts = await db('audit_logs')
      .join('audit_event_types', 'audit_logs.event_type_id', 'audit_event_types.id')
      .where({
        'audit_logs.property_id': propertyId,
        'audit_event_types.category': 'video'
      })
      .orderBy('audit_logs.created_at', 'desc')
      .limit(5);
    
    // Get overdue tasks
    const overdueTasks = await db('property_checklists')
      .where({
        property_id: propertyId,
        status: 'pending'
      })
      .where('due_date', '<', new Date())
      .count('* as count')
      .first();
    
    res.json({
      metrics,
      recentAlerts,
      overdueTasks: overdueTasks.count,
      lastUpdated: new Date()
    });
  }
}
```

## Frontend Implementation

### Audit Reports Page Component

```jsx
// src/dashboard/src/pages/AuditReports.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip
} from '@mui/material';
import { Download, Schedule, Visibility } from '@mui/icons-material';

const AuditReports = () => {
  const [templates, setTemplates] = useState([]);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  useEffect(() => {
    loadTemplates();
    loadGeneratedReports();
  }, []);
  
  const generateReport = async () => {
    const response = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: selectedTemplate,
        filters: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      })
    });
    
    if (response.ok) {
      const report = await response.json();
      loadGeneratedReports();
      // Download report
      window.open(`/api/reports/download/${report.reportId}`);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Audit Reports
      </Typography>
      
      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generate Report
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  sx={{ minWidth: 300 }}
                >
                  <MenuItem value="">Select a report template</MenuItem>
                  {templates.map(template => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  variant="contained"
                  onClick={generateReport}
                  disabled={!selectedTemplate}
                >
                  Generate Report
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Schedule />}
                  onClick={() => {/* Open schedule dialog */}}
                >
                  Schedule Report
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent Reports */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Reports
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Report Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Generated</TableCell>
                    <TableCell>Records</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {generatedReports.map(report => (
                    <TableRow key={report.id}>
                      <TableCell>{report.report_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={report.report_type} 
                          size="small"
                          color={getReportTypeColor(report.report_type)}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(report.generated_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{report.record_count}</TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => window.open(`/api/reports/download/${report.id}`)}
                        >
                          <Download />
                        </IconButton>
                        <IconButton
                          onClick={() => {/* Preview report */}}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
```

## Best Practices

### 1. Performance Optimization
- Use batch inserts for bulk audit logging
- Implement asynchronous logging for non-critical events
- Archive old audit logs to maintain performance
- Use database partitioning for large audit tables

### 2. Data Retention
- Implement automatic archival of old audit logs
- Set retention policies based on compliance requirements
- Compress archived data to save storage

### 3. Security
- Ensure audit logs are immutable
- Implement access controls for sensitive reports
- Encrypt sensitive data in audit logs
- Log all report access for compliance

### 4. Integration
- Add audit logging to all critical operations
- Implement webhooks for real-time event streaming
- Provide APIs for external reporting tools
- Support export to common formats (PDF, Excel, CSV)

## Monitoring and Maintenance

### Daily Tasks
1. Review Daily Operations Dashboard
2. Check for any system errors in audit logs
3. Verify scheduled reports ran successfully

### Weekly Tasks
1. Review Team Performance Summary
2. Analyze false positive rates for video alerts
3. Check for any unusual patterns in audit logs

### Monthly Tasks
1. Generate and review all compliance reports
2. Analyze cost trends and identify savings
3. Archive old audit logs
4. Update report templates based on feedback

## Conclusion

The audit system transforms raw activity data into actionable insights for property managers. By focusing on their daily needs and providing intuitive reports, it becomes an essential tool for operational excellence rather than just a compliance requirement.

The key to success is continuous refinement based on user feedback and evolving business needs. Regular reviews of report usage and metric accuracy ensure the system remains valuable and relevant.
