const { Member } = require('../models');
const logger = require('../utils/logger');

/**
 * Member service
 */
class MemberService {
  /**
   * Get a member by ID
   * @param {string} id - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Member
   */
  static async getMember(id, tenantId) {
    try {
      const member = await Member.getById(id, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${id}`);
      }
      
      return member;
    } catch (error) {
      logger.error(`Error getting member ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all members for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Members
   */
  static async getHouseholdMembers(householdId, tenantId) {
    try {
      const members = await Member.getByHouseholdId(householdId, tenantId);
      return members;
    } catch (error) {
      logger.error(`Error getting members for household ${householdId}:`, error);
      throw error;
    }
  }

  /**
   * Update a member
   * @param {string} id - Member ID
   * @param {Object} data - Member data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated member
   */
  static async updateMember(id, data, tenantId) {
    try {
      const member = await Member.update(id, data, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${id}`);
      }
      
      logger.info(`Updated member ${id}`);
      return member;
    } catch (error) {
      logger.error(`Error updating member ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a member
   * @param {string} id - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteMember(id, tenantId) {
    try {
      const success = await Member.delete(id, tenantId);
      
      if (!success) {
        throw new Error(`Member not found: ${id}`);
      }
      
      logger.info(`Deleted member ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting member ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get dietary preferences for a member
   * @param {string} id - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Dietary preferences
   */
  static async getDietaryPreferences(id, tenantId) {
    try {
      // First check if member exists
      const member = await Member.getById(id, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${id}`);
      }
      
      const preferences = await Member.getDietaryPreferences(id, tenantId);
      return preferences;
    } catch (error) {
      logger.error(`Error getting dietary preferences for member ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add a dietary preference for a member
   * @param {string} memberId - Member ID
   * @param {Object} data - Dietary preference data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created dietary preference
   */
  static async addDietaryPreference(memberId, data, tenantId) {
    try {
      // First check if member exists
      const member = await Member.getById(memberId, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${memberId}`);
      }
      
      const preferenceData = {
        ...data,
        memberId,
        tenantId
      };
      
      const preference = await Member.addDietaryPreference(preferenceData);
      
      logger.info(`Added dietary preference ${preference.id} to member ${memberId}`);
      return preference;
    } catch (error) {
      logger.error(`Error adding dietary preference to member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a dietary preference
   * @param {string} id - Dietary preference ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeDietaryPreference(id, tenantId) {
    try {
      const success = await Member.removeDietaryPreference(id, tenantId);
      
      if (!success) {
        throw new Error(`Dietary preference not found: ${id}`);
      }
      
      logger.info(`Removed dietary preference ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error removing dietary preference ${id}:`, error);
      throw error;
    }
  }
}

module.exports = MemberService;
