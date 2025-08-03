import api from './api';
import {
  SOPTemplate,
  SOPTemplateFilters,
  CreateSOPTemplateData,
  UpdateSOPTemplateData,
  PropertySOP,
  PropertySOPFilters,
  CreatePropertySOPData,
  UpdatePropertySOPData,
  SOPResponse,
  CreateSOPResponseData
} from '../types/sop.types';

export class SOPService {
  private static instance: SOPService;

  public static getInstance(): SOPService {
    if (!SOPService.instance) {
      SOPService.instance = new SOPService();
    }
    return SOPService.instance;
  }

  // ===== SOP Templates (like checklist templates) =====

  /**
   * Get all SOP templates with optional filtering
   */
  async getSOPTemplates(filters?: SOPTemplateFilters): Promise<{ data: SOPTemplate[]; count: number }> {
    const params = new URLSearchParams();
    
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.category) {
      params.append('category', filters.category);
    }

    const queryString = params.toString();
    const url = `/sops/templates${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  }

  /**
   * Get a specific SOP template by ID with items
   */
  async getSOPTemplateById(id: number): Promise<SOPTemplate> {
    const response = await api.get(`/sops/templates/${id}`);
    return response.data.data;
  }

  /**
   * Create a new SOP template
   */
  async createSOPTemplate(templateData: CreateSOPTemplateData): Promise<SOPTemplate> {
    const response = await api.post('/sops/templates', templateData);
    return response.data.data;
  }

  /**
   * Update an existing SOP template
   */
  async updateSOPTemplate(id: number, templateData: UpdateSOPTemplateData): Promise<SOPTemplate> {
    const response = await api.put(`/sops/templates/${id}`, templateData);
    return response.data.data;
  }

  /**
   * Delete a SOP template
   */
  async deleteSOPTemplate(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/sops/templates/${id}`);
    return response.data;
  }

  // ===== Property SOPs (like property checklists) =====

  /**
   * Get SOPs for a specific property
   */
  async getPropertySOPs(propertyId: number, filters?: PropertySOPFilters): Promise<{ data: PropertySOP[]; count: number }> {
    const params = new URLSearchParams();
    
    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.assigned_to) {
      params.append('assigned_to', filters.assigned_to.toString());
    }

    const queryString = params.toString();
    const url = `/sops/properties/${propertyId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  }

  /**
   * Assign SOP template to property
   */
  async createPropertySOP(propertyId: number, sopData: CreatePropertySOPData): Promise<PropertySOP> {
    const response = await api.post(`/sops/properties/${propertyId}`, sopData);
    return response.data.data;
  }

  /**
   * Get property SOP by ID with responses
   */
  async getPropertySOPById(id: number): Promise<PropertySOP> {
    const response = await api.get(`/sops/${id}`);
    return response.data.data;
  }

  /**
   * Update property SOP
   */
  async updatePropertySOP(id: number, updateData: UpdatePropertySOPData): Promise<PropertySOP> {
    const response = await api.put(`/sops/${id}`, updateData);
    return response.data.data;
  }

  // ===== SOP Responses =====

  /**
   * Save SOP item response
   */
  async saveSOPResponse(sopId: number, itemId: number, responseData: CreateSOPResponseData): Promise<SOPResponse> {
    const response = await api.post(`/sops/${sopId}/items/${itemId}/response`, responseData);
    return response.data.data;
  }

  /**
   * Update SOP item response
   */
  async updateSOPResponse(responseId: number, responseData: Partial<CreateSOPResponseData>): Promise<SOPResponse> {
    const response = await api.put(`/sops/responses/${responseId}`, responseData);
    return response.data.data;
  }


  // ===== Utility Methods =====

  /**
   * Get SOP categories for filtering
   */
  getSOPCategories(): string[] {
    return [
      'procedure',
      'safety',
      'security',
      'maintenance',
      'compliance',
      'training',
      'emergency',
      'quality',
      'operational',
      'administrative',
      'other'
    ];
  }

  /**
   * Get SOP statuses for filtering
   */
  getSOPStatuses(): string[] {
    return [
      'pending',
      'completed',
      'in_progress'
    ];
  }

  /**
   * Format SOP category for display
   */
  formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'procedure': 'Procedure',
      'safety': 'Safety',
      'security': 'Security',
      'maintenance': 'Maintenance',
      'compliance': 'Compliance',
      'training': 'Training',
      'emergency': 'Emergency',
      'quality': 'Quality',
      'operational': 'Operational',
      'administrative': 'Administrative',
      'other': 'Other'
    };
    return categoryMap[category] || category;
  }

  /**
   * Format SOP status for display
   */
  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'completed': 'Completed',
      'in_progress': 'In Progress'
    };
    return statusMap[status] || status;
  }

  /**
   * Get status color for UI display
   */
  getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'pending': 'default',
      'completed': 'success',
      'in_progress': 'primary'
    };
    return colorMap[status] || 'default';
  }
}

export const sopService = SOPService.getInstance();