export interface ChecklistTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  is_active: boolean;
  created_by: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  items?: ChecklistTemplateItem[];
  // Scheduling fields
  is_scheduled?: boolean;
  schedule_frequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule_interval?: number;
  schedule_days_of_week?: number[];
  schedule_day_of_month?: number;
  schedule_time?: string;
  schedule_start_date?: string;
  schedule_end_date?: string;
  schedule_advance_days?: number;
  auto_assign?: boolean;
}

export interface ChecklistTemplateItem {
  id: number;
  template_id: number;
  title: string;
  description?: string;
  item_type: 'text' | 'number' | 'boolean' | 'file' | 'photo' | 'signature';
  is_required: boolean;
  requires_approval: boolean;
  order_index: number;
  validation_rules?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Checklist {
  id: number;
  template_id: number;
  property_id: number;
  assigned_to?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  due_date?: string;
  completed_at?: string;
  approved_at?: string;
  approved_by?: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  // Nested objects (optional, for detailed views)
  template?: ChecklistTemplate;
  property?: {
    id: number;
    name: string;
    address: string;
  };
  assigned_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  items?: ChecklistItem[];
  responses?: ChecklistResponse[];
  // Flat properties from API (for list views)
  template_name?: string;
  property_name?: string;
  property_address?: string;
  assigned_to_email?: string;
  completion_stats?: {
    total_items: number;
    completed_items: number;
    pending_approval: number;
    completion_percentage: number;
  };
}

export interface ChecklistItem {
  id: number;
  checklist_id?: number;
  template_item_id?: number;
  title?: string;
  item_text?: string; // API returns this instead of title
  description?: string;
  item_type: 'text' | 'number' | 'boolean' | 'file' | 'photo' | 'signature';
  is_required: boolean;
  requires_approval?: boolean;
  order_index?: number;
  sort_order?: number; // API uses this instead of order_index
  validation_rules?: Record<string, any>;
  config_json?: Record<string, any>; // API uses this
  created_at?: string;
  updated_at?: string;
  response?: ChecklistResponse;
  // Fields from joined response data
  response_id?: number;
  response_value?: string;
  notes?: string;
  completed_by?: number;
  completed_at?: string;
  completed_by_email?: string;
  // Additional fields for UI
  status?: 'pending' | 'completed';
  required?: boolean;
  comments?: ChecklistComment[];
  attachments?: ChecklistItemAttachment[];
}

export interface ChecklistResponse {
  id: number;
  checklist_id: number;
  item_id: number;
  response_value?: string;
  response_text?: string;
  response_number?: number;
  response_boolean?: boolean;
  response_file_path?: string;
  response_file_name?: string;
  completed_by: number;
  completed_at: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  approval_notes?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  attachments?: ChecklistAttachment[];
  completed_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface ChecklistAttachment {
  id: number;
  response_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChecklistTemplateData {
  name: string;
  description?: string;
  category: string;
  items: CreateChecklistTemplateItemData[];
  // Scheduling fields
  is_scheduled?: boolean;
  schedule_frequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule_interval?: number;
  schedule_days_of_week?: number[];
  schedule_day_of_month?: number;
  schedule_time?: string | null;
  schedule_start_date?: string | null;
  schedule_end_date?: string | null;
  schedule_advance_days?: number;
  auto_assign?: boolean;
}

export interface CreateChecklistTemplateItemData {
  title: string;
  description?: string;
  item_type: 'text' | 'number' | 'boolean' | 'file' | 'photo' | 'signature';
  is_required: boolean;
  requires_approval: boolean;
  order_index: number;
  validation_rules?: Record<string, any>;
}

export interface UpdateChecklistTemplateData extends Partial<CreateChecklistTemplateData> {}

export interface CreateChecklistData {
  template_id: number;
  property_id: number;
  assigned_to?: number;
  due_date?: string;
}

export interface UpdateChecklistData {
  assigned_to?: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  due_date?: string;
}

export interface CompleteChecklistItemData {
  response_value?: string;
  response_text?: string;
  response_number?: number;
  response_boolean?: boolean;
  notes?: string;
}

export interface ChecklistFilters {
  search?: string;
  status?: string;
  property_id?: number;
  assigned_to?: number;
  template_id?: number;
  due_date_from?: string;
  due_date_to?: string;
}

export interface ChecklistTemplateFilters {
  search?: string;
  category?: string;
  is_active?: boolean;
}

export interface ApprovalQueueItem {
  id: number;
  checklist_id: number;
  item_id: number;
  response_id: number;
  checklist_name: string;
  property_name: string;
  item_title: string;
  response_value: string;
  completed_by: string;
  completed_at: string;
  requires_approval: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
}

export interface ApprovalAction {
  response_id: number;
  action: 'approve' | 'reject';
  notes?: string;
}

// Utility types for UI components
export interface ChecklistStats {
  total_checklists: number;
  pending_checklists: number;
  in_progress_checklists: number;
  completed_checklists: number;
  approved_checklists: number;
  completion_rate: number;
  approval_rate: number;
}

export interface ChecklistSummary {
  id: number;
  template_name: string;
  property_name: string;
  status: string;
  progress: number;
  due_date?: string;
  assigned_to?: string;
  created_at: string;
}

// Additional types for ChecklistDetail component
export interface ChecklistComment {
  id: number;
  checklist_id: number;
  item_id: number;
  comment_text: string;
  created_by: number;
  created_at: string;
  // Additional fields from API joins
  created_by_email?: string;
  created_by_name?: string;
}

export interface ChecklistItemAttachment {
  id: number;
  item_id?: number;
  response_id?: number;
  file_name: string; // API uses file_name
  filename?: string; // Alternative for compatibility
  file_path?: string;
  file_type?: string;
  file_size: number;
  uploaded_by: number;
  uploaded_at?: string;
  created_at: string;
  url?: string;
}

export interface ChecklistItemUpdate {
  status: 'pending' | 'completed';
  notes?: string;
}

export interface AddCommentData {
  content: string;
}

// Scheduling-specific types
export interface ChecklistSchedule {
  id?: number;
  template_id: number;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  time?: string;
  timezone?: string;
  start_date: string;
  end_date?: string;
  advance_days: number;
  auto_assign: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduledGeneration {
  id: number;
  template_id: number;
  property_id: number;
  generation_date: string;
  due_date: string;
  checklist_id?: number;
  status: 'pending' | 'created' | 'failed';
  error_message?: string;
  created_at: string;
  property_name?: string;
  checklist_status?: string;
}

export interface SchedulerStatus {
  isRunning: boolean;
  intervalMinutes: number;
  lastRun?: string;
  nextRun?: string;
}

export interface ScheduleGenerationResult {
  generatedCount: number;
  errors: Array<{
    templateId: number;
    templateName: string;
    error: string;
  }>;
  date: string;
}

export interface SchedulingFormData {
  is_scheduled: boolean;
  schedule_frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule_interval: number;
  schedule_days_of_week: number[];
  schedule_day_of_month: number;
  schedule_time: string;
  schedule_start_date: string;
  schedule_end_date: string;
  schedule_advance_days: number;
  auto_assign: boolean;
}
