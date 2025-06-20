import api from './api';

export interface AuditLog {
  id: number;
  event_type_id: number;
  category: string;
  action: string;
  user_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  tenant_id: string;
  property_id?: number;
  property_name?: string;
  entity_type?: string;
  entity_id?: string;
  description: string;
  old_values?: any;
  new_values?: any;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
}

export interface AuditFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  action?: string;
  userId?: number;
  propertyId?: number;
  entityType?: string;
  page?: number;
  limit?: number;
}

export interface AuditStatistics {
  totalEvents: number;
  todayEvents: number;
  weekEvents: number;
  monthEvents: number;
  topCategories: Array<{ category: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  topUsers: Array<{ user_name: string; count: number }>;
}

export interface PropertyMetrics {
  property_id: number;
  property_name: string;
  metric_date: string;
  avg_alert_response_minutes?: number;
  avg_work_order_hours?: number;
  inspections_completed: number;
  violations_found: number;
  tasks_completed: number;
  checklists_completed: number;
  alerts_triggered: number;
  false_positives: number;
}

export interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  template_config: any;
  is_active: boolean;
}

export interface GeneratedReport {
  id: number;
  template_id: number;
  template_name: string;
  name: string;
  description?: string;
  report_data: any;
  generated_by: number;
  generated_at: string;
  parameters: any;
}

export const auditService = {
  // Get audit logs with filtering and pagination
  async getAuditLogs(filters: AuditFilters = {}): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get('/audit/logs', { params: filters });
    const data = response.data.data || [];
    const pagination = response.data.pagination || {};
    
    return {
      logs: data,
      total: data.length,
      page: pagination.offset ? Math.floor(pagination.offset / (pagination.limit || 20)) + 1 : 1,
      totalPages: pagination.hasMore ? Math.ceil(data.length / (pagination.limit || 20)) + 1 : 1
    };
  },

  // Get recent activity feed
  async getRecentActivity(limit: number = 20): Promise<AuditLog[]> {
    const response = await api.get('/audit/activity', { params: { limit } });
    return response.data.data || [];
  },

  // Get audit statistics
  async getStatistics(): Promise<AuditStatistics> {
    const response = await api.get('/audit/statistics');
    return response.data.data || {};
  },

  // Get property metrics
  async getPropertyMetrics(propertyId?: number): Promise<PropertyMetrics[]> {
    // If no propertyId provided, return empty array since the backend requires a property ID
    if (!propertyId) {
      return [];
    }
    const response = await api.get(`/audit/metrics/${propertyId}`);
    return response.data.data || [];
  },

  // Get report templates
  async getReportTemplates(): Promise<ReportTemplate[]> {
    const response = await api.get('/audit/reports/templates');
    return response.data.data || [];
  },

  // Generate a new report
  async generateReport(templateId: number, parameters: any): Promise<GeneratedReport> {
    const response = await api.post('/audit/reports/generate', {
      templateId,
      parameters
    });
    return response.data;
  },

  // Get generated reports
  async getReports(): Promise<GeneratedReport[]> {
    const response = await api.get('/audit/reports');
    return response.data;
  },

  // Get specific report
  async getReport(reportId: number): Promise<GeneratedReport> {
    const response = await api.get(`/audit/reports/${reportId}`);
    return response.data;
  },

  // Export report data
  async exportReport(reportId: number, format: 'csv' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await api.get(`/audit/reports/${reportId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }
};

export default auditService;
