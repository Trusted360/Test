import api from './api';

export interface Property {
  id: number;
  name: string;
  address: string;
  property_type: string;
  status: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyWithStats extends Property {
  camera_count?: number;
  checklist_count?: number;
  active_alerts?: number;
}

export interface CreatePropertyData {
  name: string;
  address: string;
  property_type: string;
  status?: string;
}

export interface UpdatePropertyData extends Partial<CreatePropertyData> {}

export interface PropertyFilters {
  property_type?: string;
  status?: string;
  search?: string;
}

export interface PropertyStats {
  total_checklists: number;
  completed_checklists: number;
  pending_checklists: number;
  camera_count: number;
  active_alerts: number;
  completion_rate: number;
}

export class PropertyService {
  private static instance: PropertyService;

  public static getInstance(): PropertyService {
    if (!PropertyService.instance) {
      PropertyService.instance = new PropertyService();
    }
    return PropertyService.instance;
  }

  /**
   * Get all properties with optional filtering
   */
  async getProperties(filters?: PropertyFilters): Promise<{ data: Property[]; count: number }> {
    const params = new URLSearchParams();
    
    if (filters?.property_type) {
      params.append('property_type', filters.property_type);
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }

    const queryString = params.toString();
    const url = `/properties${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  }

  /**
   * Get properties with summary data (camera counts, checklist counts)
   */
  async getPropertiesWithSummary(): Promise<{ data: PropertyWithStats[]; count: number }> {
    const response = await api.get('/properties/summary');
    return response.data;
  }

  /**
   * Get a specific property by ID
   */
  async getPropertyById(id: number): Promise<Property> {
    const response = await api.get(`/properties/${id}`);
    return response.data.data;
  }

  /**
   * Create a new property
   */
  async createProperty(propertyData: CreatePropertyData): Promise<Property> {
    const response = await api.post('/properties', propertyData);
    return response.data.data;
  }

  /**
   * Update an existing property
   */
  async updateProperty(id: number, propertyData: UpdatePropertyData): Promise<Property> {
    const response = await api.put(`/properties/${id}`, propertyData);
    return response.data.data;
  }

  /**
   * Delete a property
   */
  async deleteProperty(id: number): Promise<void> {
    await api.delete(`/properties/${id}`);
  }

  /**
   * Get property statistics
   */
  async getPropertyStats(id: number): Promise<PropertyStats> {
    const response = await api.get(`/properties/${id}/stats`);
    return response.data.data;
  }

  /**
   * Get property types for filtering
   */
  getPropertyTypes(): string[] {
    return [
      'commercial',
      'residential',
      'industrial',
      'mixed_use',
      'retail',
      'office',
      'warehouse',
      'other'
    ];
  }

  /**
   * Get property statuses for filtering
   */
  getPropertyStatuses(): string[] {
    return [
      'active',
      'inactive',
      'maintenance',
      'pending'
    ];
  }

  /**
   * Format property type for display
   */
  formatPropertyType(type: string): string {
    const typeMap: Record<string, string> = {
      'commercial': 'Commercial',
      'residential': 'Residential',
      'industrial': 'Industrial',
      'mixed_use': 'Mixed Use',
      'retail': 'Retail',
      'office': 'Office',
      'warehouse': 'Warehouse',
      'other': 'Other'
    };
    return typeMap[type] || type;
  }

  /**
   * Format property status for display
   */
  formatPropertyStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'inactive': 'Inactive',
      'maintenance': 'Under Maintenance',
      'pending': 'Pending Setup'
    };
    return statusMap[status] || status;
  }

  /**
   * Get status color for UI display
   */
  getStatusColor(status: string): 'success' | 'error' | 'warning' | 'info' {
    const colorMap: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
      'active': 'success',
      'inactive': 'error',
      'maintenance': 'warning',
      'pending': 'info'
    };
    return colorMap[status] || 'info';
  }
}

export const propertyService = PropertyService.getInstance();
