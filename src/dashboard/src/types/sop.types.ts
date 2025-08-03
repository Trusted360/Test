// ===== SIMPLIFIED TYPES FOR BACKEND COMPATIBILITY =====
// These types match the actual backend implementation (checklist-like pattern)

export interface SOPTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  is_active: boolean;
  created_by?: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  
  // Nested relationships
  items?: SOPItem[];
  created_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface SOPItem {
  id: number;
  template_id: number;
  item_text: string;
  item_type: string;
  is_required: boolean;
  requires_approval: boolean;
  sort_order: number;
  config_json?: Record<string, any>;
}

export interface PropertySOP {
  id: number;
  property_id: number;
  template_id: number;
  assigned_to?: number;
  status: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Nested relationships
  template_name?: string;
  template_description?: string;
  category?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  items?: Array<SOPItem & { response?: SOPResponse | null }>;
}

export interface SOPResponse {
  id: number;
  sop_id: number;
  item_id: number;
  response_value?: string;
  notes?: string;
  completed_by?: number;
  completed_at?: string;
}

// Create/Update DTOs for simplified model
export interface CreateSOPTemplateData {
  name: string;
  description?: string;
  category?: string;
  items?: Array<{
    item_text: string;
    item_type?: string;
    is_required?: boolean;
    requires_approval?: boolean;
    sort_order?: number;
    config_json?: Record<string, any>;
  }>;
}

export interface UpdateSOPTemplateData extends Partial<CreateSOPTemplateData> {
  items?: Array<{
    id?: number;
    item_text: string;
    item_type?: string;
    is_required?: boolean;
    requires_approval?: boolean;
    sort_order?: number;
    config_json?: Record<string, any>;
  }>;
}

export interface CreatePropertySOPData {
  template_id: number;
  assigned_to?: number;
  due_date?: string;
}

export interface UpdatePropertySOPData {
  status?: string;
  assigned_to?: number;
  due_date?: string;
  completed_at?: string;
}

export interface CreateSOPResponseData {
  response_value?: string;
  notes?: string;
}

// Filter interfaces for simplified model
export interface SOPTemplateFilters {
  search?: string;
  category?: string;
}

export interface PropertySOPFilters {
  status?: string;
  assigned_to?: number;
}