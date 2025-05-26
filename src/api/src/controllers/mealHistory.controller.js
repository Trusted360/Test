const mealHistoryService = require('../services/mealHistory.service');
const logger = require('../utils/logger');

/**
 * MealHistoryController
 * Controller for handling meal history HTTP requests
 */
class MealHistoryController {
  /**
   * Create a new meal history record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async create(req, res) {
    try {
      const { body } = req;
      const tenantId = req.tenantId;
      
      const mealHistory = await mealHistoryService.create(body, tenantId);
      
      res.status(201).json({
        success: true,
        data: mealHistory
      });
    } catch (error) {
      logger.error('Error creating meal history:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get a meal history by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      
      const mealHistory = await mealHistoryService.getById(id, tenantId);
      
      if (!mealHistory) {
        return res.status(404).json({
          success: false,
          message: 'Meal history not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: mealHistory
      });
    } catch (error) {
      logger.error(`Error getting meal history ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get all meal history records for a household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getByHouseholdId(req, res) {
    try {
      const { householdId } = req.params;
      const { limit, offset } = req.query;
      const tenantId = req.tenantId;
      
      const options = {
        limit: limit ? parseInt(limit) : 10,
        offset: offset ? parseInt(offset) : 0
      };
      
      const mealHistories = await mealHistoryService.getByHouseholdId(householdId, tenantId, options);
      
      res.status(200).json({
        success: true,
        data: mealHistories
      });
    } catch (error) {
      logger.error(`Error getting meal history for household ${req.params.householdId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get meal history for a specific meal plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getByMealPlanId(req, res) {
    try {
      const { mealPlanId } = req.params;
      const tenantId = req.tenantId;
      
      const mealHistory = await mealHistoryService.getByMealPlanId(mealPlanId, tenantId);
      
      if (!mealHistory) {
        return res.status(404).json({
          success: false,
          message: 'Meal history not found for this meal plan'
        });
      }
      
      res.status(200).json({
        success: true,
        data: mealHistory
      });
    } catch (error) {
      logger.error(`Error getting meal history for meal plan ${req.params.mealPlanId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update a meal history record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { body } = req;
      const tenantId = req.tenantId;
      
      const mealHistory = await mealHistoryService.update(id, body, tenantId);
      
      if (!mealHistory) {
        return res.status(404).json({
          success: false,
          message: 'Meal history not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: mealHistory
      });
    } catch (error) {
      logger.error(`Error updating meal history ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Delete a meal history record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      
      const success = await mealHistoryService.delete(id, tenantId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Meal history not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Meal history deleted successfully'
      });
    } catch (error) {
      logger.error(`Error deleting meal history ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Add an item to a meal history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addItem(req, res) {
    try {
      const { mealHistoryId } = req.params;
      const { body } = req;
      const tenantId = req.tenantId;
      
      const item = await mealHistoryService.addItem({
        ...body,
        mealHistoryId
      }, tenantId);
      
      res.status(201).json({
        success: true,
        data: item
      });
    } catch (error) {
      logger.error(`Error adding item to meal history ${req.params.mealHistoryId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update a meal history item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateItem(req, res) {
    try {
      const { itemId } = req.params;
      const { body } = req;
      const tenantId = req.tenantId;
      
      const item = await mealHistoryService.updateItem(itemId, body, tenantId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Meal history item not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: item
      });
    } catch (error) {
      logger.error(`Error updating meal history item ${req.params.itemId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Add feedback for a meal history item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addFeedback(req, res) {
    try {
      const { itemId } = req.params;
      const { body } = req;
      const tenantId = req.tenantId;
      
      const feedback = await mealHistoryService.addFeedback({
        ...body,
        mealHistoryItemId: itemId
      }, tenantId);
      
      res.status(201).json({
        success: true,
        data: feedback
      });
    } catch (error) {
      logger.error(`Error adding feedback for meal history item ${req.params.itemId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get feedback for a meal history item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getFeedback(req, res) {
    try {
      const { itemId } = req.params;
      const tenantId = req.tenantId;
      
      const feedback = await mealHistoryService.getFeedback(itemId, tenantId);
      
      res.status(200).json({
        success: true,
        data: feedback
      });
    } catch (error) {
      logger.error(`Error getting feedback for meal history item ${req.params.itemId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Create a meal history record from a completed meal plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createFromMealPlan(req, res) {
    try {
      const { mealPlanId } = req.params;
      const tenantId = req.tenantId;
      
      const mealHistory = await mealHistoryService.createFromMealPlan(mealPlanId, tenantId);
      
      res.status(201).json({
        success: true,
        data: mealHistory
      });
    } catch (error) {
      logger.error(`Error creating meal history from meal plan ${req.params.mealPlanId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Generate insights from meal history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async generateInsights(req, res) {
    try {
      const { householdId } = req.params;
      const tenantId = req.tenantId;
      
      const insights = await mealHistoryService.generateInsights(householdId, tenantId);
      
      res.status(200).json({
        success: true,
        data: insights
      });
    } catch (error) {
      logger.error(`Error generating insights for household ${req.params.householdId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get meal history statistics for a household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getStatistics(req, res) {
    try {
      const { householdId } = req.params;
      const tenantId = req.tenantId;
      
      const statistics = await mealHistoryService.getStatistics(householdId, tenantId);
      
      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error(`Error getting statistics for household ${req.params.householdId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get most popular recipes based on meal history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPopularRecipes(req, res) {
    try {
      const { householdId } = req.params;
      const { limit } = req.query;
      const tenantId = req.tenantId;
      
      const recipes = await mealHistoryService.getPopularRecipes(
        householdId, 
        tenantId, 
        limit ? parseInt(limit) : 5
      );
      
      res.status(200).json({
        success: true,
        data: recipes
      });
    } catch (error) {
      logger.error(`Error getting popular recipes for household ${req.params.householdId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new MealHistoryController();
