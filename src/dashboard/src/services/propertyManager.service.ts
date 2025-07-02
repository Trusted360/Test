import api from './api';

export interface PropertyIssue {
  property_id: number;
  property_name: string;
  open_issues: number;
  in_progress_issues: number;
  overdue_issues: number;
  critical_issues: number;
  major_issues: number;
  estimated_cost: number;
  next_due_date: string | null;
}

export interface RecentInspection {
  checklist_id: number;
  property_id: number;
  property_name: string;
  checklist_name: string;
  status: string;
  completed_at: string;
  inspector_name: string;
  total_responses: number;
  issues_found: number;
  serious_issues: number;
  photos_attached: number;
  action_items_created: number;
}

export interface PropertyMetric {
  property_id: number;
  open_action_items: number;
  overdue_action_items: number;
  inspections_completed: number;
  property_score: number;
  requires_attention: boolean;
  attention_reasons: string[];
}

export interface ActionItem {
  id: number;
  property_id: number;
  property_name: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  category: string;
  status: 'open' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: number;
  assignee_name: string;
  reporter_name: string;
  due_date: string;
  cost: number;
  created_at: string;
  recent_updates?: ActionItemUpdate[];
}

export interface ActionItemUpdate {
  created_at: string;
  update_type: string;
  update_note: string;
  updated_by: string;
}

export interface ChecklistCompletion {
  id: number;
  property_name: string;
  checklist_name: string;
  category: string;
  status: string;
  completed_at: string;
  completed_by: string;
  total_items: number;
  items_with_issues: number;
  serious_issues: number;
  photo_count: number;
  issues_detail: Array<{
    item_text: string;
    response: string;
    notes: string;
    issue_severity: string;
    issue_description: string;
  }>;
}

export interface StaffPerformance {
  id: number;
  full_name: string;
  role: string;
  total_tasks_completed: number;
  total_inspections: number;
  avg_quality_score: number;
  avg_on_time_rate: number;
}

class PropertyManagerService {
  async getDashboard(options?: { dateRange?: string; propertyId?: number }) {
    const response = await api.get('/property-manager/dashboard', { params: options });
    return response.data.data;
  }

  async getChecklistCompletions(options?: {
    startDate?: string;
    endDate?: string;
    propertyId?: number;
    includePhotos?: boolean;
  }) {
    const response = await api.get('/property-manager/reports/checklist-completions', { 
      params: options 
    });
    return response.data.data;
  }

  async getActionItems(options?: {
    status?: string;
    severity?: string;
    assignedTo?: number;
    propertyId?: number;
    overdue?: boolean;
  }) {
    const response = await api.get('/property-manager/reports/action-items', { 
      params: options 
    });
    return response.data.data;
  }

  async createActionItem(actionItem: Partial<ActionItem>) {
    const response = await api.post('/property-manager/action-items', actionItem);
    return response.data.data;
  }

  async updateActionItem(id: number, update: { 
    update_type: string; 
    update_note: string; 
  }) {
    const response = await api.post(`/property-manager/action-items/${id}/updates`, update);
    return response.data;
  }

  async getStaffPerformance(options?: { startDate?: string; endDate?: string }) {
    const response = await api.get('/property-manager/reports/staff-performance', { 
      params: options 
    });
    return response.data.data;
  }

  async getRecurringIssues(propertyId?: number) {
    const response = await api.get('/property-manager/reports/recurring-issues', { 
      params: propertyId ? { propertyId } : {} 
    });
    return response.data.data;
  }

  async getPropertyInspectionSummary(propertyId: number, days: number = 30) {
    const response = await api.get(
      `/property-manager/properties/${propertyId}/inspection-summary`,
      { params: { days } }
    );
    return response.data.data;
  }

  async exportReport(reportType: string, format: string, params: any) {
    const response = await api.get('/property-manager/reports/export', {
      params: { reportType, format, ...params },
      responseType: format === 'csv' ? 'blob' : 'arraybuffer'
    });
    return response.data;
  }
}

export default new PropertyManagerService();