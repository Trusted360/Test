import api from './api';
import {
  ChecklistTemplate,
  ChecklistTemplateFilters,
  CreateChecklistTemplateData,
  UpdateChecklistTemplateData,
  Checklist,
  ChecklistFilters,
  CreateChecklistData,
  UpdateChecklistData,
  CompleteChecklistItemData,
  ApprovalQueueItem,
  ApprovalAction,
  ChecklistStats,
  ChecklistSummary,
  ChecklistAttachment
} from '../types/checklist.types';

export class ChecklistService {
  private static instance: ChecklistService;

  public static getInstance(): ChecklistService {
    if (!ChecklistService.instance) {
      ChecklistService.instance = new ChecklistService();
    }
    return ChecklistService.instance;
  }

  // Template Management Methods

  /**
   * Get all checklist templates with optional filtering
   */
  async getTemplates(filters?: ChecklistTemplateFilters): Promise<{ data: ChecklistTemplate[]; count: number }> {
    const params = new URLSearchParams();
    
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.property_type) {
      params.append('property_type', filters.property_type);
    }
    if (filters?.category) {
      params.append('category', filters.category);
    }
    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }

    const queryString = params.toString();
    const url = `/checklists/templates${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  }

  /**
   * Get a specific template by ID with items
   */
  async getTemplateById(id: number): Promise<ChecklistTemplate> {
    const response = await api.get(`/checklists/templates/${id}`);
    return response.data.data;
  }

  /**
   * Create a new checklist template
   */
  async createTemplate(templateData: CreateChecklistTemplateData): Promise<ChecklistTemplate> {
    // Transform frontend data to match backend expectations
    const transformedData = {
      ...templateData,
      items: templateData.items.map((item, index) => ({
        item_text: item.title, // Backend expects item_text, not title
        item_type: item.item_type,
        is_required: item.is_required,
        requires_approval: item.requires_approval,
        sort_order: item.order_index || index,
        config_json: {
          description: item.description,
          validation_rules: item.validation_rules
        }
      }))
    };
    
    const response = await api.post('/checklists/templates', transformedData);
    return response.data.data;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: number, templateData: UpdateChecklistTemplateData): Promise<ChecklistTemplate> {
    // Transform frontend data to match backend expectations
    const transformedData = {
      ...templateData,
      items: templateData.items?.map((item, index) => ({
        item_text: item.title, // Backend expects item_text, not title
        item_type: item.item_type,
        is_required: item.is_required,
        requires_approval: item.requires_approval,
        sort_order: item.order_index || index,
        config_json: {
          description: item.description,
          validation_rules: item.validation_rules
        }
      }))
    };
    
    const response = await api.put(`/checklists/templates/${id}`, transformedData);
    return response.data.data;
  }

  /**
   * Delete a template (soft delete)
   */
  async deleteTemplate(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/checklists/templates/${id}`);
    return response.data.data;
  }

  // Checklist Instance Management Methods

  /**
   * Get all checklists with optional filtering
   */
  async getChecklists(filters?: ChecklistFilters): Promise<{ data: Checklist[]; count: number }> {
    const params = new URLSearchParams();
    
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.property_id) {
      params.append('property_id', filters.property_id.toString());
    }
    if (filters?.assigned_to) {
      params.append('assigned_to', filters.assigned_to.toString());
    }
    if (filters?.template_id) {
      params.append('template_id', filters.template_id.toString());
    }

    const queryString = params.toString();
    const url = `/checklists${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  }

  /**
   * Get current user's checklists
   */
  async getMyChecklists(status?: string): Promise<{ data: Checklist[]; count: number }> {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }

    const queryString = params.toString();
    const url = `/checklists/my${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  }

  /**
   * Get a specific checklist by ID with items and responses
   */
  async getChecklistById(id: number): Promise<Checklist> {
    const response = await api.get(`/checklists/${id}`);
    return response.data.data;
  }

  /**
   * Get a specific checklist by ID (alias for getChecklistById)
   */
  async getChecklist(id: number): Promise<Checklist> {
    return this.getChecklistById(id);
  }

  /**
   * Create a new checklist instance
   */
  async createChecklist(checklistData: CreateChecklistData): Promise<Checklist> {
    const response = await api.post('/checklists', checklistData);
    return response.data.data;
  }

  /**
   * Update checklist status
   */
  async updateChecklistStatus(id: number, status: string): Promise<Checklist> {
    const response = await api.put(`/checklists/${id}/status`, { status });
    return response.data.data;
  }

  /**
   * Delete a checklist
   */
  async deleteChecklist(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/checklists/${id}`);
    return response.data;
  }

  /**
   * Get checklists for a specific property
   */
  async getChecklistsByProperty(propertyId: number): Promise<{ data: Checklist[]; count: number }> {
    const response = await api.get(`/checklists/property/${propertyId}`);
    return response.data;
  }

  // Item Completion Methods

  /**
   * Complete a checklist item
   */
  async completeItem(checklistId: number, itemId: number, responseData: CompleteChecklistItemData): Promise<any> {
    const response = await api.post(`/checklists/${checklistId}/items/${itemId}/complete`, responseData);
    return response.data.data;
  }

  /**
   * Update a checklist item
   */
  async updateChecklistItem(checklistId: number, itemId: number, updateData: { status: string; notes?: string }): Promise<any> {
    const response = await api.put(`/checklists/${checklistId}/items/${itemId}`, updateData);
    return response.data.data;
  }

  /**
   * Add a comment to a checklist item
   */
  async addItemComment(checklistId: number, itemId: number, commentData: { content: string }): Promise<any> {
    const response = await api.post(`/checklists/${checklistId}/items/${itemId}/comments`, commentData);
    return response.data.data;
  }

  /**
   * Submit checklist for approval
   */
  async submitForApproval(checklistId: number): Promise<any> {
    const response = await api.post(`/checklists/${checklistId}/submit-approval`);
    return response.data.data;
  }

  /**
   * Upload file attachment for a checklist response
   */
  async uploadAttachment(checklistId: number, responseId: number, file: File): Promise<ChecklistAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('response_id', responseId.toString());

    const response = await api.post(`/checklists/${checklistId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  // Approval Workflow Methods

  /**
   * Get approval queue for current user or specific approver
   */
  async getApprovalQueue(approverId?: number): Promise<{ data: ApprovalQueueItem[]; count: number }> {
    const params = new URLSearchParams();
    if (approverId) {
      params.append('approver_id', approverId.toString());
    }

    const queryString = params.toString();
    const url = `/checklists/approvals/queue${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  }

  /**
   * Approve a checklist response
   */
  async approveResponse(responseId: number, notes?: string): Promise<{ message: string }> {
    const response = await api.post(`/checklists/approvals/${responseId}/approve`, { notes });
    return response.data.data;
  }

  /**
   * Reject a checklist response
   */
  async rejectResponse(responseId: number, notes: string): Promise<{ message: string }> {
    const response = await api.post(`/checklists/approvals/${responseId}/reject`, { notes });
    return response.data.data;
  }

  /**
   * Process multiple approval actions
   */
  async processApprovalActions(actions: ApprovalAction[]): Promise<{ processed: number; errors: any[] }> {
    const results = {
      processed: 0,
      errors: [] as any[]
    };

    for (const action of actions) {
      try {
        if (action.action === 'approve') {
          await this.approveResponse(action.response_id, action.notes);
        } else {
          await this.rejectResponse(action.response_id, action.notes || 'Rejected');
        }
        results.processed++;
      } catch (error) {
        results.errors.push({
          response_id: action.response_id,
          error: error
        });
      }
    }

    return results;
  }

  // Utility Methods

  /**
   * Get checklist categories for filtering
   */
  getChecklistCategories(): string[] {
    return [
      'security',
      'safety',
      'maintenance',
      'compliance',
      'inspection',
      'emergency',
      'cleaning',
      'equipment',
      'documentation',
      'video_event',
      'other'
    ];
  }

  /**
   * Get checklist statuses for filtering
   */
  getChecklistStatuses(): string[] {
    return [
      'pending',
      'in_progress',
      'completed',
      'approved',
      'rejected'
    ];
  }

  /**
   * Get item types for template creation
   */
  getItemTypes(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: 'text', label: 'Text Input', description: 'Single line text response' },
      { value: 'number', label: 'Number Input', description: 'Numeric value response' },
      { value: 'boolean', label: 'Yes/No', description: 'Boolean checkbox response' },
      { value: 'file', label: 'File Upload', description: 'Document or file attachment' },
      { value: 'photo', label: 'Photo', description: 'Image capture or upload' },
      { value: 'signature', label: 'Signature', description: 'Digital signature capture' }
    ];
  }

  /**
   * Format checklist category for display
   */
  formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'security': 'Security',
      'safety': 'Safety',
      'maintenance': 'Maintenance',
      'compliance': 'Compliance',
      'inspection': 'Inspection',
      'emergency': 'Emergency',
      'cleaning': 'Cleaning',
      'equipment': 'Equipment',
      'documentation': 'Documentation',
      'video_event': 'Video Event',
      'other': 'Other'
    };
    return categoryMap[category] || category;
  }

  /**
   * Format checklist status for display
   */
  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'approved': 'Approved',
      'rejected': 'Rejected'
    };
    return statusMap[status] || status;
  }

  /**
   * Get status color for UI display
   */
  getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'pending': 'default',
      'in_progress': 'primary',
      'completed': 'info',
      'approved': 'success',
      'rejected': 'error'
    };
    return colorMap[status] || 'default';
  }

  /**
   * Calculate checklist progress percentage
   */
  calculateProgress(checklist: Checklist): number {
    if (!checklist.items || checklist.items.length === 0) {
      return 0;
    }

    const completedItems = checklist.items.filter(item => item.response).length;
    return Math.round((completedItems / checklist.items.length) * 100);
  }

  /**
   * Check if checklist is overdue
   */
  isOverdue(checklist: Checklist): boolean {
    if (!checklist.due_date || checklist.status === 'completed' || checklist.status === 'approved') {
      return false;
    }

    const dueDate = new Date(checklist.due_date);
    const now = new Date();
    return dueDate < now;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate checklist template data
   */
  validateTemplateData(data: CreateChecklistTemplateData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!data.category || data.category.trim().length === 0) {
      errors.push('Category is required');
    }

    if (!data.items || data.items.length === 0) {
      errors.push('At least one checklist item is required');
    }

    data.items?.forEach((item, index) => {
      if (!item.title || item.title.trim().length === 0) {
        errors.push(`Item ${index + 1}: Title is required`);
      }
      if (!item.item_type) {
        errors.push(`Item ${index + 1}: Item type is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const checklistService = ChecklistService.getInstance();
