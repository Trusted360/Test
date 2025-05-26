const { RecipeRatingService } = require('../services');
const logger = require('../utils/logger');

/**
 * RecipeRating controller
 */
class RecipeRatingController {
  /**
   * Rate a recipe
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async rateRecipe(req, res) {
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
      
      const result = await RecipeRatingService.rateRecipe(
        { memberId, recipeId, rating, feedback },
        tenantId
      );
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error rating recipe:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get a rating by ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async getRating(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      
      const rating = await RecipeRatingService.getRating(id, tenantId);
      
      return res.status(200).json({
        success: true,
        data: rating
      });
    } catch (error) {
      logger.error(`Error getting rating ${req.params.id}:`, error);
      return res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get a member's rating for a recipe
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async getMemberRating(req, res) {
    try {
      const { memberId, recipeId } = req.params;
      const tenantId = req.tenantId;
      
      const rating = await RecipeRatingService.getMemberRating(memberId, recipeId, tenantId);
      
      return res.status(200).json({
        success: true,
        data: rating
      });
    } catch (error) {
      logger.error(`Error getting member rating:`, error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get all ratings for a recipe
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async getRecipeRatings(req, res) {
    try {
      const { recipeId } = req.params;
      const tenantId = req.tenantId;
      
      const ratings = await RecipeRatingService.getRecipeRatings(recipeId, tenantId);
      
      return res.status(200).json({
        success: true,
        data: ratings
      });
    } catch (error) {
      logger.error(`Error getting recipe ratings:`, error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get all ratings by a member
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async getMemberRatings(req, res) {
    try {
      const { memberId } = req.params;
      const tenantId = req.tenantId;
      
      const ratings = await RecipeRatingService.getMemberRatings(memberId, tenantId);
      
      return res.status(200).json({
        success: true,
        data: ratings
      });
    } catch (error) {
      logger.error(`Error getting member ratings:`, error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get average rating for a recipe
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async getAverageRating(req, res) {
    try {
      const { recipeId } = req.params;
      const tenantId = req.tenantId;
      
      const averageRating = await RecipeRatingService.getAverageRating(recipeId, tenantId);
      
      return res.status(200).json({
        success: true,
        data: averageRating
      });
    } catch (error) {
      logger.error(`Error getting average rating:`, error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get top rated recipes
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async getTopRatedRecipes(req, res) {
    try {
      const { limit, tags } = req.query;
      const tenantId = req.tenantId;
      
      // Parse options
      const options = {
        limit: limit ? parseInt(limit, 10) : 10,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : []
      };
      
      const topRatedRecipes = await RecipeRatingService.getTopRatedRecipes(options, tenantId);
      
      return res.status(200).json({
        success: true,
        data: topRatedRecipes
      });
    } catch (error) {
      logger.error(`Error getting top rated recipes:`, error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Delete a rating
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  static async deleteRating(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      
      const success = await RecipeRatingService.deleteRating(id, tenantId);
      
      return res.status(200).json({
        success: true,
        data: { deleted: success }
      });
    } catch (error) {
      logger.error(`Error deleting rating ${req.params.id}:`, error);
      return res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = RecipeRatingController;
