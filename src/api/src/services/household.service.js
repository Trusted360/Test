const { Household, Member } = require('../models');
const logger = require('../utils/logger');

/**
 * Household service
 */
class HouseholdService {
  /**
   * Create a new household
   * @param {Object} data - Household data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created household
   */
  static async createHousehold(data, tenantId) {
    try {
      const householdData = {
        ...data,
        tenantId
      };
      
      const household = await Household.create(householdData);
      
      logger.info(`Created household ${household.id}`);
      return household;
    } catch (error) {
      logger.error('Error creating household:', error);
      throw error;
    }
  }

  /**
   * Get a household by ID
   * @param {string} id - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Household
   */
  static async getHousehold(id, tenantId) {
    try {
      const household = await Household.getById(id, tenantId);
      
      if (!household) {
        throw new Error(`Household not found: ${id}`);
      }
      
      return household;
    } catch (error) {
      logger.error(`Error getting household ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all households for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Households
   */
  static async getAllHouseholds(tenantId) {
    try {
      const households = await Household.getAll(tenantId);
      return households;
    } catch (error) {
      logger.error('Error getting households:', error);
      throw error;
    }
  }

  /**
   * Update a household
   * @param {string} id - Household ID
   * @param {Object} data - Household data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated household
   */
  static async updateHousehold(id, data, tenantId) {
    try {
      const household = await Household.update(id, data, tenantId);
      
      if (!household) {
        throw new Error(`Household not found: ${id}`);
      }
      
      logger.info(`Updated household ${id}`);
      return household;
    } catch (error) {
      logger.error(`Error updating household ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a household
   * @param {string} id - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteHousehold(id, tenantId) {
    try {
      const success = await Household.delete(id, tenantId);
      
      if (!success) {
        throw new Error(`Household not found: ${id}`);
      }
      
      logger.info(`Deleted household ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting household ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get members of a household
   * @param {string} id - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Members
   */
  static async getHouseholdMembers(id, tenantId) {
    try {
      // First check if household exists
      const household = await Household.getById(id, tenantId);
      
      if (!household) {
        throw new Error(`Household not found: ${id}`);
      }
      
      const members = await Household.getMembers(id, tenantId);
      return members;
    } catch (error) {
      logger.error(`Error getting members for household ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add a member to a household
   * @param {string} householdId - Household ID
   * @param {Object} data - Member data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created member
   */
  static async addMember(householdId, data, tenantId) {
    try {
      // First check if household exists
      const household = await Household.getById(householdId, tenantId);
      
      if (!household) {
        throw new Error(`Household not found: ${householdId}`);
      }
      
      const memberData = {
        ...data,
        householdId,
        tenantId
      };
      
      const member = await Member.create(memberData);
      
      logger.info(`Added member ${member.id} to household ${householdId}`);
      return member;
    } catch (error) {
      logger.error(`Error adding member to household ${householdId}:`, error);
      throw error;
    }
  }

  /**
   * Get meal plans for a household
   * @param {string} id - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Meal plans
   */
  static async getHouseholdMealPlans(id, tenantId) {
    try {
      // First check if household exists
      const household = await Household.getById(id, tenantId);
      
      if (!household) {
        throw new Error(`Household not found: ${id}`);
      }
      
      const mealPlans = await Household.getMealPlans(id, tenantId);
      return mealPlans;
    } catch (error) {
      logger.error(`Error getting meal plans for household ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get shopping lists for a household
   * @param {string} id - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Shopping lists
   */
  static async getHouseholdShoppingLists(id, tenantId) {
    try {
      // First check if household exists
      const household = await Household.getById(id, tenantId);
      
      if (!household) {
        throw new Error(`Household not found: ${id}`);
      }
      
      const shoppingLists = await Household.getShoppingLists(id, tenantId);
      return shoppingLists;
    } catch (error) {
      logger.error(`Error getting shopping lists for household ${id}:`, error);
      throw error;
    }
  }
}

module.exports = HouseholdService;
