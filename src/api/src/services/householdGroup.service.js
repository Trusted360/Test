const { HouseholdGroup, HouseholdGroupMember, MealPlanGroup, Household, Member } = require('../models');
const logger = require('../utils/logger');

/**
 * Household Group service
 */
class HouseholdGroupService {
  /**
   * Create a new household group
   * @param {string} householdId - Household ID
   * @param {Object} data - Group data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created group
   */
  static async createGroup(householdId, data, tenantId) {
    try {
      // First check if household exists
      const household = await Household.getById(householdId, tenantId);
      
      if (!household) {
        throw new Error(`Household not found: ${householdId}`);
      }
      
      const groupData = {
        ...data,
        householdId,
        tenantId
      };
      
      const group = await HouseholdGroup.create(groupData);
      
      logger.info(`Created household group ${group.id} for household ${householdId}`);
      return group;
    } catch (error) {
      logger.error(`Error creating group for household ${householdId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a household group by ID
   * @param {string} id - Group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Household group
   */
  static async getGroup(id, tenantId) {
    try {
      const group = await HouseholdGroup.getById(id, tenantId);
      
      if (!group) {
        throw new Error(`Group not found: ${id}`);
      }
      
      return group;
    } catch (error) {
      logger.error(`Error getting group ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all groups for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Household groups
   */
  static async getHouseholdGroups(householdId, tenantId) {
    try {
      // First check if household exists
      const household = await Household.getById(householdId, tenantId);
      
      if (!household) {
        throw new Error(`Household not found: ${householdId}`);
      }
      
      const groups = await HouseholdGroup.getByHouseholdId(householdId, tenantId);
      return groups;
    } catch (error) {
      logger.error(`Error getting groups for household ${householdId}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a household group
   * @param {string} id - Group ID
   * @param {Object} data - Group data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated group
   */
  static async updateGroup(id, data, tenantId) {
    try {
      const group = await HouseholdGroup.update(id, data, tenantId);
      
      if (!group) {
        throw new Error(`Group not found: ${id}`);
      }
      
      logger.info(`Updated household group ${id}`);
      return group;
    } catch (error) {
      logger.error(`Error updating group ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a household group
   * @param {string} id - Group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteGroup(id, tenantId) {
    try {
      const success = await HouseholdGroup.delete(id, tenantId);
      
      if (!success) {
        throw new Error(`Group not found: ${id}`);
      }
      
      logger.info(`Deleted household group ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting group ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Add a member to a group
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @param {boolean} isPrimary - Whether the member is primary
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created group member
   */
  static async addMemberToGroup(groupId, memberId, isPrimary, tenantId) {
    try {
      // First check if group exists
      const group = await HouseholdGroup.getById(groupId, tenantId);
      
      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }
      
      // Check if member exists
      const member = await Member.getById(memberId, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${memberId}`);
      }
      
      // Check if member belongs to the same household as the group
      if (member.household_id !== group.household_id) {
        throw new Error(`Member ${memberId} does not belong to the same household as group ${groupId}`);
      }
      
      // Check if member is already in the group
      const existingMember = await HouseholdGroupMember.getByGroupAndMember(groupId, memberId, tenantId);
      
      if (existingMember) {
        throw new Error(`Member ${memberId} is already in group ${groupId}`);
      }
      
      const groupMemberData = {
        groupId,
        memberId,
        isPrimary,
        tenantId
      };
      
      let groupMember = await HouseholdGroupMember.create(groupMemberData);
      
      // If this member is primary, ensure no other member in the group is primary
      if (isPrimary) {
        groupMember = await HouseholdGroupMember.setPrimaryMember(groupId, memberId, tenantId);
      }
      
      logger.info(`Added member ${memberId} to group ${groupId}`);
      return groupMember;
    } catch (error) {
      logger.error(`Error adding member ${memberId} to group ${groupId}:`, error);
      throw error;
    }
  }
  
  /**
   * Remove a member from a group
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeMemberFromGroup(groupId, memberId, tenantId) {
    try {
      const success = await HouseholdGroupMember.deleteByGroupAndMember(groupId, memberId, tenantId);
      
      if (!success) {
        throw new Error(`Member ${memberId} not found in group ${groupId}`);
      }
      
      logger.info(`Removed member ${memberId} from group ${groupId}`);
      return true;
    } catch (error) {
      logger.error(`Error removing member ${memberId} from group ${groupId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get members of a group
   * @param {string} id - Group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Group members
   */
  static async getGroupMembers(id, tenantId) {
    try {
      // First check if group exists
      const group = await HouseholdGroup.getById(id, tenantId);
      
      if (!group) {
        throw new Error(`Group not found: ${id}`);
      }
      
      const members = await HouseholdGroup.getMembers(id, tenantId);
      return members;
    } catch (error) {
      logger.error(`Error getting members for group ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Set a member as primary for a group
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated group member
   */
  static async setPrimaryMember(groupId, memberId, tenantId) {
    try {
      // First check if group exists
      const group = await HouseholdGroup.getById(groupId, tenantId);
      
      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }
      
      // Check if member is in the group
      const groupMember = await HouseholdGroupMember.getByGroupAndMember(groupId, memberId, tenantId);
      
      if (!groupMember) {
        throw new Error(`Member ${memberId} is not in group ${groupId}`);
      }
      
      const updatedGroupMember = await HouseholdGroupMember.setPrimaryMember(groupId, memberId, tenantId);
      
      logger.info(`Set member ${memberId} as primary for group ${groupId}`);
      return updatedGroupMember;
    } catch (error) {
      logger.error(`Error setting primary member ${memberId} for group ${groupId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get groups a member belongs to
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Groups
   */
  static async getMemberGroups(memberId, tenantId) {
    try {
      // Check if member exists
      const member = await Member.getById(memberId, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${memberId}`);
      }
      
      const groups = await HouseholdGroupMember.getGroupsByMember(memberId, tenantId);
      return groups;
    } catch (error) {
      logger.error(`Error getting groups for member ${memberId}:`, error);
      throw error;
    }
  }
  
  /**
   * Associate a meal plan with a group
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} groupId - Group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal plan group
   */
  static async associateMealPlanWithGroup(mealPlanId, groupId, tenantId) {
    try {
      // First check if group exists
      const group = await HouseholdGroup.getById(groupId, tenantId);
      
      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }
      
      const mealPlanGroupData = {
        mealPlanId,
        groupId,
        tenantId
      };
      
      const mealPlanGroup = await MealPlanGroup.create(mealPlanGroupData);
      
      logger.info(`Associated meal plan ${mealPlanId} with group ${groupId}`);
      return mealPlanGroup;
    } catch (error) {
      logger.error(`Error associating meal plan ${mealPlanId} with group ${groupId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get meal plans for a group
   * @param {string} id - Group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Meal plans
   */
  static async getGroupMealPlans(id, tenantId) {
    try {
      // First check if group exists
      const group = await HouseholdGroup.getById(id, tenantId);
      
      if (!group) {
        throw new Error(`Group not found: ${id}`);
      }
      
      const mealPlans = await HouseholdGroup.getMealPlans(id, tenantId);
      return mealPlans;
    } catch (error) {
      logger.error(`Error getting meal plans for group ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get groups for a meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Groups
   */
  static async getMealPlanGroups(mealPlanId, tenantId) {
    try {
      const groups = await MealPlanGroup.getGroupsByMealPlan(mealPlanId, tenantId);
      return groups;
    } catch (error) {
      logger.error(`Error getting groups for meal plan ${mealPlanId}:`, error);
      throw error;
    }
  }
  
  /**
   * Remove a meal plan from a group
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} groupId - Group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeMealPlanFromGroup(mealPlanId, groupId, tenantId) {
    try {
      // First get the meal plan group
      const mealPlanGroup = await MealPlanGroup.getByMealPlanAndGroup(mealPlanId, groupId, tenantId);
      
      if (!mealPlanGroup) {
        throw new Error(`Meal plan ${mealPlanId} is not associated with group ${groupId}`);
      }
      
      const success = await MealPlanGroup.delete(mealPlanGroup.id, tenantId);
      
      logger.info(`Removed meal plan ${mealPlanId} from group ${groupId}`);
      return success;
    } catch (error) {
      logger.error(`Error removing meal plan ${mealPlanId} from group ${groupId}:`, error);
      throw error;
    }
  }
}

module.exports = HouseholdGroupService; 