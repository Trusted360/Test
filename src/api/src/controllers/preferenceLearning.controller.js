const { PreferenceLearningService } = require('../services');
const logger = require('../utils/logger');

/**
 * PreferenceLearning controller
 */
class PreferenceLearningController {
  /**
   * Learn from recipe rating
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async learnFromRating(req, res) {
    try {
      const { memberId, recipeId, rating, feedback } = req.body;
      const tenantId = req.tenantId;
      
      // Validate required fields
      if (!memberId || !recipeId || !rating) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: memberId, recipeId, rating'
        });
      }
      
      // Validate rating (1-5)
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }
      
      const result = await PreferenceLearningService.learnFromRating(
        { memberId, recipeId, rating, feedback },
        tenantId
      );
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error learning from rating:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get personalized recipe recommendations
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async getRecommendations(req, res) {
    try {
      const { memberId } = req.params;
      const { limit, tags, excludeRecipeIds } = req.query;
      const tenantId = req.tenantId;
      
      // Validate required fields
      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: memberId'
        });
      }
      
      // Parse options
      const options = {
        limit: limit ? parseInt(limit, 10) : 10,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
        excludeRecipeIds: excludeRecipeIds ? (Array.isArray(excludeRecipeIds) ? excludeRecipeIds : [excludeRecipeIds]) : []
      };
      
      const recommendations = await PreferenceLearningService.getRecommendations(
        memberId,
        options,
        tenantId
      );
      
      return res.status(200).json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Enhance meal plan with learned preferences
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async enhanceMealPlan(req, res) {
    try {
      const { mealPlanId } = req.params;
      const tenantId = req.tenantId;
      
      // Validate required fields
      if (!mealPlanId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: mealPlanId'
        });
      }
      
      const enhancedMealPlan = await PreferenceLearningService.enhanceMealPlan(
        mealPlanId,
        tenantId
      );
      
      return res.status(200).json({
        success: true,
        data: enhancedMealPlan
      });
    } catch (error) {
      logger.error('Error enhancing meal plan:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Analyze member preferences
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async analyzePreferences(req, res) {
    try {
      const { memberId } = req.params;
      const tenantId = req.tenantId;
      
      // Validate required fields
      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: memberId'
        });
      }
      
      const analysis = await PreferenceLearningService.analyzePreferences(
        memberId,
        tenantId
      );
      
      return res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('Error analyzing preferences:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = PreferenceLearningController;
