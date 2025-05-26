const { RecipeRating } = require('../models');
const logger = require('../utils/logger');
const { redisClient } = require('./redis');

/**
 * RecipeRating service
 * Handles recipe rating operations and integration with preference learning
 */
class RecipeRatingService {
  /**
   * Create or update a recipe rating
   * @param {Object} data - Rating data
   * @param {string} data.memberId - Member ID
   * @param {string} data.recipeId - Recipe ID
   * @param {number} data.rating - Rating (1-5)
   * @param {string} data.feedback - Optional feedback text
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created or updated rating
   */
  static async rateRecipe(data, tenantId) {
    try {
      const { memberId, recipeId, rating, feedback } = data;
      
      // Create or update the rating
      const ratingRecord = await RecipeRating.create({
        memberId,
        recipeId,
        rating,
        feedback,
        tenantId
      });
      
      // Invalidate cache for this recipe's average rating
      await this._invalidateRatingCache(recipeId, tenantId);
      
      // Emit an event for preference learning to handle asynchronously
      // This avoids the circular dependency while still allowing preference learning
      const event = {
        type: 'RECIPE_RATED',
        data: { memberId, recipeId, rating, feedback },
        tenantId
      };
      
      // In a real implementation, this would use a proper event system
      // For now, just log it
      logger.info('Recipe rating event emitted:', event);
      
      return ratingRecord;
    } catch (error) {
      logger.error('Error rating recipe:', error);
      throw error;
    }
  }
  
  /**
   * Get a rating by ID
   * @param {string} id - Rating ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Rating
   */
  static async getRating(id, tenantId) {
    try {
      const rating = await RecipeRating.getById(id, tenantId);
      
      if (!rating) {
        throw new Error(`Rating not found: ${id}`);
      }
      
      return rating;
    } catch (error) {
      logger.error(`Error getting rating ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a member's rating for a recipe
   * @param {string} memberId - Member ID
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Rating
   */
  static async getMemberRating(memberId, recipeId, tenantId) {
    try {
      const rating = await RecipeRating.getByMemberAndRecipe(memberId, recipeId, tenantId);
      return rating || null;
    } catch (error) {
      logger.error(`Error getting member rating for recipe ${recipeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all ratings for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Ratings
   */
  static async getRecipeRatings(recipeId, tenantId) {
    try {
      const ratings = await RecipeRating.getByRecipe(recipeId, tenantId);
      return ratings;
    } catch (error) {
      logger.error(`Error getting ratings for recipe ${recipeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all ratings by a member
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Ratings
   */
  static async getMemberRatings(memberId, tenantId) {
    try {
      const ratings = await RecipeRating.getByMember(memberId, tenantId);
      return ratings;
    } catch (error) {
      logger.error(`Error getting ratings for member ${memberId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get average rating for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Average rating
   */
  static async getAverageRating(recipeId, tenantId) {
    try {
      // Check cache first
      const cacheKey = `recipe:${recipeId}:avgRating`;
      const cachedRating = await redisClient.get(cacheKey);
      
      if (cachedRating) {
        logger.debug(`Returning cached average rating for recipe ${recipeId}`);
        return JSON.parse(cachedRating);
      }
      
      // Get average rating from database
      const averageRating = await RecipeRating.getAverageRating(recipeId, tenantId);
      
      // Cache for 1 hour
      await redisClient.set(cacheKey, JSON.stringify(averageRating), { EX: 3600 });
      
      return averageRating;
    } catch (error) {
      logger.error(`Error getting average rating for recipe ${recipeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get top rated recipes
   * @param {Object} options - Options
   * @param {number} options.limit - Maximum number of recipes to return
   * @param {Array} options.tags - Optional tags to filter by
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Top rated recipes
   */
  static async getTopRatedRecipes(options, tenantId) {
    try {
      const { limit = 10, tags = [] } = options;
      
      // Check cache first
      const cacheKey = `topRatedRecipes:${JSON.stringify(options)}`;
      const cachedRecipes = await redisClient.get(cacheKey);
      
      if (cachedRecipes) {
        logger.debug('Returning cached top rated recipes');
        return JSON.parse(cachedRecipes);
      }
      
      // In a real implementation, this would query the database
      // For now, return placeholder data
      const topRatedRecipes = [
        {
          id: 'recipe1',
          name: 'Vegetable Stir Fry',
          averageRating: 4.8,
          ratingCount: 25
        },
        {
          id: 'recipe2',
          name: 'Chicken Parmesan',
          averageRating: 4.7,
          ratingCount: 32
        },
        {
          id: 'recipe3',
          name: 'Chocolate Chip Cookies',
          averageRating: 4.6,
          ratingCount: 48
        }
      ];
      
      // Cache for 1 hour
      await redisClient.set(cacheKey, JSON.stringify(topRatedRecipes), { EX: 3600 });
      
      return topRatedRecipes;
    } catch (error) {
      logger.error('Error getting top rated recipes:', error);
      throw error;
    }
  }
  
  /**
   * Delete a rating
   * @param {string} id - Rating ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteRating(id, tenantId) {
    try {
      // Get the rating first to get the recipe ID
      const rating = await RecipeRating.getById(id, tenantId);
      
      if (!rating) {
        throw new Error(`Rating not found: ${id}`);
      }
      
      // Delete the rating
      const success = await RecipeRating.delete(id, tenantId);
      
      if (success) {
        // Invalidate cache for this recipe's average rating
        await this._invalidateRatingCache(rating.recipe_id, tenantId);
      }
      
      return success;
    } catch (error) {
      logger.error(`Error deleting rating ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Invalidate rating cache
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<void>}
   * @private
   */
  static async _invalidateRatingCache(recipeId, tenantId) {
    try {
      // Delete cache for this recipe's average rating
      const avgRatingKey = `recipe:${recipeId}:avgRating`;
      
      // Delete cache for top rated recipes
      const topRatedPattern = 'topRatedRecipes:*';
      
      // In a real implementation, this would use Redis SCAN and DEL commands
      // For now, just log the operation
      logger.debug(`Invalidated cache for keys: ${avgRatingKey}, ${topRatedPattern}`);
    } catch (error) {
      logger.error(`Error invalidating rating cache for recipe ${recipeId}:`, error);
      // Non-critical error, don't throw
    }
  }
}

module.exports = RecipeRatingService;
