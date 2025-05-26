const MealHistory = require('../models/mealHistory.model');
const logger = require('../utils/logger');

/**
 * MealHistoryService
 * Service for managing meal history records
 */
class MealHistoryService {
  /**
   * Create a new meal history record
   * @param {Object} data - Meal history data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal history
   */
  async create(data, tenantId) {
    try {
      return await MealHistory.create({
        ...data,
        tenantId
      });
    } catch (error) {
      logger.error('Error creating meal history:', error);
      throw new Error(`Failed to create meal history: ${error.message}`);
    }
  }

  /**
   * Get a meal history by ID
   * @param {string} id - Meal history ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Meal history
   */
  async getById(id, tenantId) {
    try {
      return await MealHistory.getById(id, tenantId);
    } catch (error) {
      logger.error(`Error getting meal history ${id}:`, error);
      throw new Error(`Failed to get meal history: ${error.message}`);
    }
  }

  /**
   * Get all meal history records for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Meal history records
   */
  async getByHouseholdId(householdId, tenantId, options = {}) {
    try {
      return await MealHistory.getByHouseholdId(householdId, tenantId, options);
    } catch (error) {
      logger.error(`Error getting meal history for household ${householdId}:`, error);
      throw new Error(`Failed to get household meal history: ${error.message}`);
    }
  }

  /**
   * Get meal history for a specific meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Meal history
   */
  async getByMealPlanId(mealPlanId, tenantId) {
    try {
      return await MealHistory.getByMealPlanId(mealPlanId, tenantId);
    } catch (error) {
      logger.error(`Error getting meal history for meal plan ${mealPlanId}:`, error);
      throw new Error(`Failed to get meal plan history: ${error.message}`);
    }
  }

  /**
   * Update a meal history record
   * @param {string} id - Meal history ID
   * @param {Object} data - Meal history data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated meal history
   */
  async update(id, data, tenantId) {
    try {
      return await MealHistory.update(id, data, tenantId);
    } catch (error) {
      logger.error(`Error updating meal history ${id}:`, error);
      throw new Error(`Failed to update meal history: ${error.message}`);
    }
  }

  /**
   * Delete a meal history record
   * @param {string} id - Meal history ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  async delete(id, tenantId) {
    try {
      return await MealHistory.delete(id, tenantId);
    } catch (error) {
      logger.error(`Error deleting meal history ${id}:`, error);
      throw new Error(`Failed to delete meal history: ${error.message}`);
    }
  }

  /**
   * Add an item to a meal history
   * @param {Object} data - Meal history item data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal history item
   */
  async addItem(data, tenantId) {
    try {
      const item = await MealHistory.addItem({
        ...data,
        tenantId
      });
      
      // Update completion percentage
      await MealHistory.updateCompletionPercentage(data.mealHistoryId, tenantId);
      
      return item;
    } catch (error) {
      logger.error('Error adding item to meal history:', error);
      throw new Error(`Failed to add item to meal history: ${error.message}`);
    }
  }

  /**
   * Update a meal history item
   * @param {string} id - Meal history item ID
   * @param {Object} data - Meal history item data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated meal history item
   */
  async updateItem(id, data, tenantId) {
    try {
      const item = await MealHistory.updateItem(id, data, tenantId);
      
      if (item) {
        // Update completion percentage
        await MealHistory.updateCompletionPercentage(item.meal_history_id, tenantId);
      }
      
      return item;
    } catch (error) {
      logger.error(`Error updating meal history item ${id}:`, error);
      throw new Error(`Failed to update meal history item: ${error.message}`);
    }
  }

  /**
   * Add feedback for a meal history item
   * @param {Object} data - Feedback data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created feedback
   */
  async addFeedback(data, tenantId) {
    try {
      return await MealHistory.addFeedback({
        ...data,
        tenantId
      });
    } catch (error) {
      logger.error('Error adding meal feedback:', error);
      throw new Error(`Failed to add meal feedback: ${error.message}`);
    }
  }

  /**
   * Get feedback for a meal history item
   * @param {string} mealHistoryItemId - Meal history item ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Feedback
   */
  async getFeedback(mealHistoryItemId, tenantId) {
    try {
      return await MealHistory.getFeedback(mealHistoryItemId, tenantId);
    } catch (error) {
      logger.error(`Error getting feedback for meal history item ${mealHistoryItemId}:`, error);
      throw new Error(`Failed to get meal feedback: ${error.message}`);
    }
  }

  /**
   * Create a meal history record from a completed meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal history
   */
  async createFromMealPlan(mealPlanId, tenantId) {
    try {
      return await MealHistory.createFromMealPlan(mealPlanId, tenantId);
    } catch (error) {
      logger.error(`Error creating meal history from meal plan ${mealPlanId}:`, error);
      throw new Error(`Failed to create meal history from meal plan: ${error.message}`);
    }
  }

  /**
   * Generate insights from meal history
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Generated insights
   */
  async generateInsights(householdId, tenantId) {
    try {
      return await MealHistory.generateInsights(householdId, tenantId);
    } catch (error) {
      logger.error(`Error generating insights for household ${householdId}:`, error);
      throw new Error(`Failed to generate insights: ${error.message}`);
    }
  }

  /**
   * Get meal history statistics for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(householdId, tenantId) {
    try {
      // Get all meal history records for this household
      const historyQuery = `
        SELECT id, completion_percentage
        FROM meal_history
        WHERE household_id = $1 AND tenant_id = $2
      `;
      
      const pool = require('../database').pool;
      const historyValues = [householdId, tenantId];
      const historyResult = await pool.query(historyQuery, historyValues);
      
      if (historyResult.rows.length === 0) {
        return {
          totalMealPlans: 0,
          averageCompletion: 0,
          fullyCompletedPlans: 0,
          partiallyCompletedPlans: 0
        };
      }
      
      const totalMealPlans = historyResult.rows.length;
      const completionPercentages = historyResult.rows.map(row => row.completion_percentage);
      const averageCompletion = Math.round(
        completionPercentages.reduce((sum, percentage) => sum + percentage, 0) / totalMealPlans
      );
      const fullyCompletedPlans = completionPercentages.filter(percentage => percentage === 100).length;
      const partiallyCompletedPlans = totalMealPlans - fullyCompletedPlans;
      
      // Get feedback statistics
      const feedbackQuery = `
        SELECT AVG(mf.rating) as average_rating,
               COUNT(*) as total_feedback,
               SUM(CASE WHEN mf.would_eat_again = true THEN 1 ELSE 0 END) as would_eat_again,
               SUM(CASE WHEN mf.consumed_all = true THEN 1 ELSE 0 END) as consumed_all
        FROM meal_feedback mf
        JOIN meal_history_items mhi ON mf.meal_history_item_id = mhi.id
        JOIN meal_history mh ON mhi.meal_history_id = mh.id
        WHERE mh.household_id = $1 AND mf.tenant_id = $2
      `;
      
      const feedbackValues = [householdId, tenantId];
      const feedbackResult = await pool.query(feedbackQuery, feedbackValues);
      
      const feedbackStats = feedbackResult.rows[0];
      
      return {
        totalMealPlans,
        averageCompletion,
        fullyCompletedPlans,
        partiallyCompletedPlans,
        feedback: {
          averageRating: parseFloat(feedbackStats.average_rating || 0).toFixed(1),
          totalFeedback: parseInt(feedbackStats.total_feedback || 0),
          wouldEatAgainPercentage: feedbackStats.total_feedback > 0 
            ? Math.round((feedbackStats.would_eat_again / feedbackStats.total_feedback) * 100) 
            : 0,
          consumedAllPercentage: feedbackStats.total_feedback > 0 
            ? Math.round((feedbackStats.consumed_all / feedbackStats.total_feedback) * 100) 
            : 0
        }
      };
    } catch (error) {
      logger.error(`Error getting statistics for household ${householdId}:`, error);
      throw new Error(`Failed to get meal history statistics: ${error.message}`);
    }
  }

  /**
   * Get most popular recipes based on meal history
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @param {number} limit - Maximum number of recipes to return
   * @returns {Promise<Array>} Popular recipes
   */
  async getPopularRecipes(householdId, tenantId, limit = 5) {
    try {
      const query = `
        SELECT r.id, r.title, r.image_url,
               COUNT(mhi.id) as preparation_count,
               AVG(mf.rating) as average_rating,
               COUNT(mf.id) as feedback_count
        FROM meal_history_items mhi
        JOIN meal_history mh ON mhi.meal_history_id = mh.id
        JOIN recipes r ON mhi.recipe_id = r.id
        LEFT JOIN meal_feedback mf ON mhi.id = mf.meal_history_item_id
        WHERE mh.household_id = $1 
          AND mhi.was_prepared = true
          AND mhi.tenant_id = $2
        GROUP BY r.id, r.title, r.image_url
        ORDER BY preparation_count DESC, average_rating DESC
        LIMIT $3
      `;
      
      const pool = require('../database').pool;
      const values = [householdId, tenantId, limit];
      const result = await pool.query(query, values);
      
      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        imageUrl: row.image_url,
        preparationCount: parseInt(row.preparation_count),
        averageRating: parseFloat(row.average_rating || 0).toFixed(1),
        feedbackCount: parseInt(row.feedback_count)
      }));
    } catch (error) {
      logger.error(`Error getting popular recipes for household ${householdId}:`, error);
      throw new Error(`Failed to get popular recipes: ${error.message}`);
    }
  }
}

module.exports = new MealHistoryService();
