const { ShoppingList } = require('../models');
const logger = require('../utils/logger');

/**
 * ShoppingList service
 */
class ShoppingListService {
  /**
   * Create a new shopping list
   * @param {Object} data - Shopping list data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created shopping list
   */
  static async createShoppingList(data, tenantId) {
    try {
      const shoppingListData = {
        ...data,
        tenantId
      };
      
      const shoppingList = await ShoppingList.create(shoppingListData);
      
      logger.info(`Created shopping list ${shoppingList.id}`);
      return shoppingList;
    } catch (error) {
      logger.error('Error creating shopping list:', error);
      throw error;
    }
  }

  /**
   * Get a shopping list by ID
   * @param {string} id - Shopping list ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Shopping list
   */
  static async getShoppingList(id, tenantId) {
    try {
      const shoppingList = await ShoppingList.getById(id, tenantId);
      
      if (!shoppingList) {
        throw new Error(`Shopping list not found: ${id}`);
      }
      
      return shoppingList;
    } catch (error) {
      logger.error(`Error getting shopping list ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all shopping lists for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Shopping lists
   */
  static async getHouseholdShoppingLists(householdId, tenantId) {
    try {
      const shoppingLists = await ShoppingList.getByHouseholdId(householdId, tenantId);
      return shoppingLists;
    } catch (error) {
      logger.error(`Error getting shopping lists for household ${householdId}:`, error);
      throw error;
    }
  }

  /**
   * Get current shopping list for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Current shopping list
   */
  static async getCurrentShoppingList(householdId, tenantId) {
    try {
      const shoppingList = await ShoppingList.getCurrentForHousehold(householdId, tenantId);
      return shoppingList;
    } catch (error) {
      logger.error(`Error getting current shopping list for household ${householdId}:`, error);
      throw error;
    }
  }

  /**
   * Update a shopping list
   * @param {string} id - Shopping list ID
   * @param {Object} data - Shopping list data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated shopping list
   */
  static async updateShoppingList(id, data, tenantId) {
    try {
      const shoppingList = await ShoppingList.update(id, data, tenantId);
      
      if (!shoppingList) {
        throw new Error(`Shopping list not found: ${id}`);
      }
      
      logger.info(`Updated shopping list ${id}`);
      return shoppingList;
    } catch (error) {
      logger.error(`Error updating shopping list ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a shopping list
   * @param {string} id - Shopping list ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteShoppingList(id, tenantId) {
    try {
      const success = await ShoppingList.delete(id, tenantId);
      
      if (!success) {
        throw new Error(`Shopping list not found: ${id}`);
      }
      
      logger.info(`Deleted shopping list ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting shopping list ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add an item to a shopping list
   * @param {string} shoppingListId - Shopping list ID
   * @param {Object} data - Shopping list item data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created shopping list item
   */
  static async addShoppingListItem(shoppingListId, data, tenantId) {
    try {
      // First check if shopping list exists
      const shoppingList = await ShoppingList.getById(shoppingListId, tenantId);
      
      if (!shoppingList) {
        throw new Error(`Shopping list not found: ${shoppingListId}`);
      }
      
      const itemData = {
        ...data,
        shoppingListId,
        tenantId
      };
      
      const item = await ShoppingList.addItem(itemData);
      
      logger.info(`Added item ${item.id} to shopping list ${shoppingListId}`);
      return item;
    } catch (error) {
      logger.error(`Error adding item to shopping list ${shoppingListId}:`, error);
      throw error;
    }
  }

  /**
   * Update a shopping list item
   * @param {string} id - Shopping list item ID
   * @param {Object} data - Shopping list item data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated shopping list item
   */
  static async updateShoppingListItem(id, data, tenantId) {
    try {
      const item = await ShoppingList.updateItem(id, data, tenantId);
      
      if (!item) {
        throw new Error(`Shopping list item not found: ${id}`);
      }
      
      logger.info(`Updated shopping list item ${id}`);
      return item;
    } catch (error) {
      logger.error(`Error updating shopping list item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Mark a shopping list item as purchased or not purchased
   * @param {string} id - Shopping list item ID
   * @param {boolean} purchased - Whether the item has been purchased
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated shopping list item
   */
  static async markItemPurchased(id, purchased, tenantId) {
    try {
      const item = await ShoppingList.markItemPurchased(id, purchased, tenantId);
      
      if (!item) {
        throw new Error(`Shopping list item not found: ${id}`);
      }
      
      logger.info(`Marked shopping list item ${id} as ${purchased ? 'purchased' : 'not purchased'}`);
      return item;
    } catch (error) {
      logger.error(`Error marking shopping list item ${id} as ${purchased ? 'purchased' : 'not purchased'}:`, error);
      throw error;
    }
  }

  /**
   * Remove an item from a shopping list
   * @param {string} id - Shopping list item ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeShoppingListItem(id, tenantId) {
    try {
      const success = await ShoppingList.removeItem(id, tenantId);
      
      if (!success) {
        throw new Error(`Shopping list item not found: ${id}`);
      }
      
      logger.info(`Removed item ${id} from shopping list`);
      return true;
    } catch (error) {
      logger.error(`Error removing item ${id} from shopping list:`, error);
      throw error;
    }
  }

  /**
   * Generate a shopping list from a meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Generated shopping list
   */
  static async generateFromMealPlan(mealPlanId, tenantId) {
    try {
      const shoppingList = await ShoppingList.generateFromMealPlan({
        mealPlanId,
        tenantId
      });
      
      logger.info(`Generated shopping list from meal plan ${mealPlanId}`);
      return shoppingList;
    } catch (error) {
      logger.error(`Error generating shopping list from meal plan ${mealPlanId}:`, error);
      throw error;
    }
  }
}

module.exports = ShoppingListService;
