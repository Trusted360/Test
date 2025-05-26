import api from './api.js';

// Types
export interface MealPlan {
  id: string;
  household_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed';
  approval_status: 'pending' | 'approved' | 'rejected' | 'finalized';
  created_at: string;
  updated_at: string;
  items?: MealPlanItem[];
}

export interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  recipe_id: string;
  planned_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  notes?: string;
  recipe_title: string;
  recipe_description?: string;
  recipe_image_url?: string;
  prep_time?: number;
  cook_time?: number;
}

export interface MealPlanVersion {
  id: string;
  meal_plan_id: string;
  version_number: number;
  created_at: string;
  created_by: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  data: MealPlan;
}

export interface MealPlanApproval {
  id: string;
  meal_plan_id: string;
  member_id: string;
  member_name: string;
  version_number: number;
  response: 'approved' | 'rejected' | 'partially_approved';
  response_date: string;
  feedback?: string;
  itemApprovals?: MealPlanItemApproval[];
}

export interface MealPlanItemApproval {
  id: string;
  meal_plan_approval_id: string;
  meal_plan_item_id: string;
  response: 'approved' | 'rejected';
  suggested_recipe_id?: string;
  feedback?: string;
  recipe_title?: string;
  recipe_image_url?: string;
}

export interface ApprovalResponse {
  response: 'approved' | 'rejected' | 'partially_approved';
  feedback?: string;
  itemApprovals?: {
    mealPlanItemId: string;
    response: 'approved' | 'rejected';
    suggestedRecipeId?: string;
    feedback?: string;
  }[];
}

export interface ApprovalDetails {
  mealPlan: MealPlan;
  version: MealPlanVersion;
  approvals: MealPlanApproval[];
  comments: any[];
  consensus: {
    approvedCount: number;
    rejectedCount: number;
    partiallyApprovedCount: number;
    totalMembers: number;
    totalResponses: number;
    approvalPercentage: number;
    status: 'pending' | 'approved' | 'rejected';
  };
}

const MealPlanService = {
  /**
   * Get all meal plans
   */
  getAllMealPlans: async (): Promise<MealPlan[]> => {
    const response = await api.get('/api/meal-plans');
    return response.data;
  },

  /**
   * Get meal plans filtered by group ID
   */
  getMealPlansByGroup: async (groupId: string): Promise<MealPlan[]> => {
    const response = await api.get(`/api/household-groups/${groupId}/meal-plans`);
    return response.data;
  },

  /**
   * Get a meal plan by ID
   */
  getMealPlan: async (id: string): Promise<MealPlan> => {
    const response = await api.get(`/api/meal-plans/${id}`);
    return response.data;
  },

  /**
   * Create a new meal plan
   */
  createMealPlan: async (mealPlan: Partial<MealPlan>): Promise<MealPlan> => {
    const response = await api.post('/api/meal-plans', mealPlan);
    return response.data;
  },

  /**
   * Update a meal plan
   */
  updateMealPlan: async (id: string, mealPlan: Partial<MealPlan>): Promise<MealPlan> => {
    const response = await api.put(`/api/meal-plans/${id}`, mealPlan);
    return response.data;
  },

  /**
   * Delete a meal plan
   */
  deleteMealPlan: async (id: string): Promise<void> => {
    await api.delete(`/api/meal-plans/${id}`);
  },

  /**
   * Add an item to a meal plan
   */
  addMealPlanItem: async (mealPlanId: string, item: Partial<MealPlanItem>): Promise<MealPlanItem> => {
    const response = await api.post(`/api/meal-plans/${mealPlanId}/items`, item);
    return response.data;
  },

  /**
   * Remove an item from a meal plan
   */
  removeMealPlanItem: async (mealPlanId: string, itemId: string): Promise<void> => {
    await api.delete(`/api/meal-plans/${mealPlanId}/items/${itemId}`);
  },

  /**
   * Generate a meal plan
   */
  generateMealPlan: async (params: {
    startDate: string;
    endDate: string;
    name: string;
    mealTypes?: string[];
    servings?: number;
    householdId?: string;
    groupIds?: string[];
  }): Promise<MealPlan> => {
    const response = await api.post('/api/meal-plans/generate', params);
    return response.data;
  },

  /**
   * Submit a meal plan for approval
   */
  submitForApproval: async (mealPlanId: string): Promise<MealPlanVersion> => {
    const response = await api.post(`/api/meal-plans/${mealPlanId}/submit`);
    return response.data;
  },

  /**
   * Get approval details for a meal plan version
   */
  getApprovalDetails: async (mealPlanId: string, versionNumber: number): Promise<ApprovalDetails> => {
    const response = await api.get(`/api/meal-plans/${mealPlanId}/versions/${versionNumber}/approval`);
    return response.data;
  },

  /**
   * Submit an approval response for a meal plan
   */
  submitApprovalResponse: async (
    mealPlanId: string, 
    versionNumber: number, 
    data: ApprovalResponse
  ): Promise<MealPlanApproval> => {
    const response = await api.post(
      `/api/meal-plans/${mealPlanId}/versions/${versionNumber}/approve`, 
      data
    );
    return response.data;
  },

  /**
   * Finalize an approved meal plan
   */
  finalizeMealPlan: async (mealPlanId: string): Promise<MealPlan> => {
    const response = await api.post(`/api/meal-plans/${mealPlanId}/finalize`);
    return response.data;
  }
};

export default MealPlanService; 