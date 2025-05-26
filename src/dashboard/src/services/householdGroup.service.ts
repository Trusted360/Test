import api from './api';

export interface HouseholdGroup {
  id: string;
  name: string;
  description: string;
  householdId: string;
  created_at: string;
  updated_at: string;
  memberCount?: number;
}

export interface GroupMember {
  id: string;
  member_id: string;
  member_name: string;
  group_id: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealPlanGroup {
  id: string;
  meal_plan_id: string;
  group_id: string;
  created_at: string;
  updated_at: string;
  group_name?: string;
  group_description?: string;
}

const HouseholdGroupService = {
  /**
   * Get all groups for a household
   */
  getGroups: async (householdId: string): Promise<HouseholdGroup[]> => {
    const response = await api.get(`/api/households/${householdId}/groups`);
    return response.data;
  },

  /**
   * Get a group by ID
   */
  getGroup: async (groupId: string): Promise<HouseholdGroup> => {
    const response = await api.get(`/api/groups/${groupId}`);
    return response.data;
  },

  /**
   * Create a new household group
   */
  createGroup: async (householdId: string, data: Partial<HouseholdGroup>): Promise<HouseholdGroup> => {
    const response = await api.post(`/api/households/${householdId}/groups`, data);
    return response.data;
  },

  /**
   * Update a household group
   */
  updateGroup: async (groupId: string, data: Partial<HouseholdGroup>): Promise<HouseholdGroup> => {
    const response = await api.put(`/api/groups/${groupId}`, data);
    return response.data;
  },

  /**
   * Delete a household group
   */
  deleteGroup: async (groupId: string): Promise<void> => {
    await api.delete(`/api/groups/${groupId}`);
  },

  /**
   * Get members of a group
   */
  getGroupMembers: async (groupId: string): Promise<GroupMember[]> => {
    const response = await api.get(`/api/groups/${groupId}/members`);
    return response.data;
  },

  /**
   * Add a member to a group
   */
  addMemberToGroup: async (groupId: string, memberId: string, isPrimary: boolean): Promise<GroupMember> => {
    const response = await api.post(`/api/groups/${groupId}/members/${memberId}`, {
      isPrimary
    });
    return response.data;
  },

  /**
   * Remove a member from a group
   */
  removeMemberFromGroup: async (groupId: string, memberId: string): Promise<void> => {
    await api.delete(`/api/groups/${groupId}/members/${memberId}`);
  },

  /**
   * Set a member as primary for a group
   */
  setPrimaryMember: async (groupId: string, memberId: string): Promise<GroupMember> => {
    const response = await api.put(`/api/groups/${groupId}/members/${memberId}/primary`);
    return response.data;
  },

  /**
   * Get groups for a member
   */
  getMemberGroups: async (memberId: string): Promise<HouseholdGroup[]> => {
    const response = await api.get(`/api/members/${memberId}/groups`);
    return response.data;
  },

  /**
   * Get meal plans associated with a group
   */
  getGroupMealPlans: async (groupId: string): Promise<any[]> => {
    const response = await api.get(`/api/groups/${groupId}/meal-plans`);
    return response.data;
  },

  /**
   * Get groups associated with a meal plan
   */
  getMealPlanGroups: async (mealPlanId: string): Promise<MealPlanGroup[]> => {
    const response = await api.get(`/api/meal-plans/${mealPlanId}/groups`);
    return response.data;
  },

  /**
   * Associate a meal plan with a group
   */
  associateMealPlanWithGroup: async (mealPlanId: string, groupId: string): Promise<MealPlanGroup> => {
    const response = await api.post(`/api/meal-plans/${mealPlanId}/groups`, { groupId });
    return response.data;
  },

  /**
   * Remove association between a meal plan and a group
   */
  removeMealPlanFromGroup: async (mealPlanId: string, groupId: string): Promise<void> => {
    await api.delete(`/api/meal-plans/${mealPlanId}/groups/${groupId}`);
  }
};

export default HouseholdGroupService; 