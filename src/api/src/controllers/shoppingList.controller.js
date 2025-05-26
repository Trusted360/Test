const { ShoppingListService } = require('../services');
const logger = require('../utils/logger');

/**
 * ShoppingList controller
 */
class ShoppingListController {
  /**
   * Create a new shopping list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async createShoppingList(req, res, next) {
    try {
      const { 
        householdId, 
        mealPlanId, 
        name, 
        status 
      } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!householdId || !name) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: householdId and name are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const shoppingListData = {
        householdId,
        mealPlanId,
        name,
        status
      };
      
      const shoppingList = await ShoppingListService.createShoppingList(shoppingListData, tenantId);
      
      res.status(201).json(shoppingList);
    } catch (error) {
      logger.error('Error in createShoppingList controller:', error);
      next(error);
    }
  }

  /**
   * Get a shopping list by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getShoppingList(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const shoppingList = await ShoppingListService.getShoppingList(id, tenantId);
      
      res.json(shoppingList);
    } catch (error) {
      logger.error(`Error in getShoppingList controller for ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Get all shopping lists for a household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getHouseholdShoppingLists(req, res, next) {
    try {
      const { householdId } = req.params;
      const tenantId = req.user.tenantId;
      
      const shoppingLists = await ShoppingListService.getHouseholdShoppingLists(householdId, tenantId);
      
      res.json(shoppingLists);
    } catch (error) {
      logger.error(`Error in getHouseholdShoppingLists controller for household ID ${req.params.householdId}:`, error);
      next(error);
    }
  }

  /**
   * Get current shopping list for a household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getCurrentShoppingList(req, res, next) {
    try {
      const { householdId } = req.params;
      const tenantId = req.user.tenantId;
      
      const shoppingList = await ShoppingListService.getCurrentShoppingList(householdId, tenantId);
      
      if (!shoppingList) {
        return res.status(404).json({
          error: {
            message: `No active shopping list found for household: ${householdId}`,
            code: 'NOT_FOUND'
          }
        });
      }
      
      res.json(shoppingList);
    } catch (error) {
      logger.error(`Error in getCurrentShoppingList controller for household ID ${req.params.householdId}:`, error);
      next(error);
    }
  }

  /**
   * Update a shopping list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateShoppingList(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        name, 
        status 
      } = req.body;
      const tenantId = req.user.tenantId;
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (status !== undefined) updateData.status = status;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: {
            message: 'No update parameters provided',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const shoppingList = await ShoppingListService.updateShoppingList(id, updateData, tenantId);
      
      res.json(shoppingList);
    } catch (error) {
      logger.error(`Error in updateShoppingList controller for ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Delete a shopping list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async deleteShoppingList(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const success = await ShoppingListService.deleteShoppingList(id, tenantId);
      
      if (!success) {
        return res.status(404).json({
          error: {
            message: `Shopping list not found: ${id}`,
            code: 'NOT_FOUND'
          }
        });
      }
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in deleteShoppingList controller for ID ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * Add an item to a shopping list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async addShoppingListItem(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        ingredientId, 
        name, 
        quantity, 
        unitId, 
        storeSection, 
        purchased, 
        notes 
      } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!name) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: name is required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const itemData = {
        ingredientId,
        name,
        quantity,
        unitId,
        storeSection,
        purchased,
        notes
      };
      
      const item = await ShoppingListService.addShoppingListItem(id, itemData, tenantId);
      
      res.status(201).json(item);
    } catch (error) {
      logger.error(`Error in addShoppingListItem controller for list ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Update a shopping list item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateShoppingListItem(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        name, 
        quantity, 
        unitId, 
        storeSection, 
        purchased, 
        notes 
      } = req.body;
      const tenantId = req.user.tenantId;
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (quantity !== undefined) updateData.quantity = quantity;
      if (unitId !== undefined) updateData.unitId = unitId;
      if (storeSection !== undefined) updateData.storeSection = storeSection;
      if (purchased !== undefined) updateData.purchased = purchased;
      if (notes !== undefined) updateData.notes = notes;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: {
            message: 'No update parameters provided',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const item = await ShoppingListService.updateShoppingListItem(id, updateData, tenantId);
      
      if (!item) {
        return res.status(404).json({
          error: {
            message: `Shopping list item not found: ${id}`,
            code: 'NOT_FOUND'
          }
        });
      }
      
      res.json(item);
    } catch (error) {
      logger.error(`Error in updateShoppingListItem controller for ID ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * Mark a shopping list item as purchased or not purchased
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async markItemPurchased(req, res, next) {
    try {
      const { id } = req.params;
      const { purchased } = req.body;
      const tenantId = req.user.tenantId;
      
      if (purchased === undefined) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: purchased is required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const item = await ShoppingListService.markItemPurchased(id, purchased, tenantId);
      
      if (!item) {
        return res.status(404).json({
          error: {
            message: `Shopping list item not found: ${id}`,
            code: 'NOT_FOUND'
          }
        });
      }
      
      res.json(item);
    } catch (error) {
      logger.error(`Error in markItemPurchased controller for ID ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * Remove an item from a shopping list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async removeShoppingListItem(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const success = await ShoppingListService.removeShoppingListItem(id, tenantId);
      
      if (!success) {
        return res.status(404).json({
          error: {
            message: `Shopping list item not found: ${id}`,
            code: 'NOT_FOUND'
          }
        });
      }
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in removeShoppingListItem controller for ID ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * Generate a shopping list from a meal plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async generateFromMealPlan(req, res, next) {
    try {
      const { mealPlanId } = req.params;
      const tenantId = req.user.tenantId;
      
      const shoppingList = await ShoppingListService.generateFromMealPlan({
        mealPlanId,
        tenantId
      });
      
      res.status(201).json(shoppingList);
    } catch (error) {
      logger.error(`Error in generateFromMealPlan controller for meal plan ID ${req.params.mealPlanId}:`, error);
      next(error);
    }
  }

  /**
   * Get all store sections
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getStoreSections(req, res, next) {
    try {
      const tenantId = req.user.tenantId;
      const { StoreSection } = require('../models');
      
      const sections = await StoreSection.getAll(tenantId);
      
      res.json(sections);
    } catch (error) {
      logger.error('Error in getStoreSections controller:', error);
      next(error);
    }
  }

  /**
   * Create a new store section
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async createStoreSection(req, res, next) {
    try {
      const { name, displayOrder } = req.body;
      const tenantId = req.user.tenantId;
      const { StoreSection } = require('../models');
      
      if (!name) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: name is required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const sectionData = {
        name,
        displayOrder: displayOrder || 999,
        tenantId
      };
      
      const section = await StoreSection.create(sectionData);
      
      res.status(201).json(section);
    } catch (error) {
      logger.error('Error in createStoreSection controller:', error);
      next(error);
    }
  }

  /**
   * Update a store section
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateStoreSection(req, res, next) {
    try {
      const { id } = req.params;
      const { name, displayOrder } = req.body;
      const tenantId = req.user.tenantId;
      const { StoreSection } = require('../models');
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: {
            message: 'No update parameters provided',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const section = await StoreSection.update(id, updateData, tenantId);
      
      if (!section) {
        return res.status(404).json({
          error: {
            message: `Store section not found: ${id}`,
            code: 'NOT_FOUND'
          }
        });
      }
      
      res.json(section);
    } catch (error) {
      logger.error(`Error in updateStoreSection controller for ID ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * Delete a store section
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async deleteStoreSection(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const { StoreSection } = require('../models');
      
      const success = await StoreSection.delete(id, tenantId);
      
      if (!success) {
        return res.status(404).json({
          error: {
            message: `Store section not found: ${id}`,
            code: 'NOT_FOUND'
          }
        });
      }
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in deleteStoreSection controller for ID ${req.params.id}:`, error);
      next(error);
    }
  }
}
