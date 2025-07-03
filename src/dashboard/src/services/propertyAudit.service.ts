import api from './api';

export interface ChecklistItem {
  checklist_id: number;
  item_text: string;
  item_type: string;
  is_required: boolean;
  response_value: string | null;
  notes: string | null;
  issue_severity: string | null;
  issue_description: string | null;
  item_completed_at: string | null;
  completed_by_name: string | null;
  completed_by_email: string | null;
  attachments: number;
  comments: number;
}

export interface PropertyChecklist {
  checklist_id: number;
  property_id: number;
  property_name: string;
  property_address: string;
  template_id: number;
  template_name: string;
  category: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  created_by_name: string | null;
  completion_percentage: number;
  total_items: number;
  completed_items: number;
  items_with_issues: number;
  critical_issues: number;
  attachment_count: number;
  last_activity: string | null;
  items: ChecklistItem[];
}

export interface PropertyAuditSummary {
  total_checklists: number;
  total_properties: number;
  completed_checklists: number;
  pending_checklists: number;
  in_progress_checklists: number;
  overdue_checklists: number;
}

export interface PropertyAuditActivity {
  id: number;
  action: string;
  description: string;
  entity_id: number;
  property_id: number;
  created_at: string;
  user_name: string;
  user_email: string;
  metadata: any;
}

export interface PropertyAuditData {
  checklists: PropertyChecklist[];
  summary: PropertyAuditSummary;
  auditActivity: PropertyAuditActivity[];
  filters: {
    startDate: string;
    endDate: string;
    propertyId: number | null;
    status: string | null;
    assignedTo: number | null;
  };
}

export interface PropertyAuditFilters {
  startDate?: string;
  endDate?: string;
  propertyId?: number;
  status?: string;
  assignedTo?: number;
}

class PropertyAuditService {
  async getPropertyAuditData(filters: PropertyAuditFilters = {}): Promise<PropertyAuditData> {
    try {
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.propertyId) params.append('propertyId', filters.propertyId.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo.toString());
      
      const response = await api.get(`/property-manager/property-audits?${params.toString()}`);
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch property audit data:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch property audit data');
    }
  }

  // Helper method to get status color
  getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      case 'approved':
        return 'primary';
      default:
        return 'default';
    }
  }

  // Helper method to get severity color
  getSeverityColor(severity: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'major':
        return 'warning';
      case 'moderate':
        return 'info';
      case 'minor':
        return 'success';
      default:
        return 'default';
    }
  }

  // Helper method to format percentage
  formatPercentage(value: number): string {
    return `${Math.round(value)}%`;
  }

  // Helper method to calculate overdue status
  isOverdue(dueDate: string | null, status: string): boolean {
    if (!dueDate || status === 'completed' || status === 'approved') {
      return false;
    }
    return new Date(dueDate) < new Date();
  }
}

export default new PropertyAuditService();