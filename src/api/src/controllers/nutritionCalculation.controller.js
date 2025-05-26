const { NutritionCalculationService } = require('../services');
const logger = require('../utils/logger');

/**
 * NutritionCalculation controller
 * Handles nutrition calculation API endpoints
 */
class NutritionCalculationController {
  /**
   * Calculate nutritional information for a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async calculateNutrition(req, res, next) {
    try {
      const { recipeId } = req.params;
      
      if (!recipeId) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: recipeId',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const nutritionInfo = await NutritionCalculationService.calculateNutrition(
        recipeId,
        tenantId
      );
      
      res.json(nutritionInfo);
    } catch (error) {
      logger.error('Error calculating nutrition:', error);
      next(error);
    }
  }
  
  /**
   * Update nutritional information when a recipe is scaled
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateNutritionForScaling(req, res, next) {
    try {
      const { recipeId } = req.params;
      const { servings } = req.body;
      
      if (!recipeId || !servings || isNaN(servings) || servings <= 0) {
        return res.status(400).json({
          error: {
            message: 'Missing or invalid parameters: recipeId and servings (positive number) are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const updatedNutrition = await NutritionCalculationService.updateNutritionForScaling(
        recipeId,
        parseInt(servings, 10),
        tenantId
      );
      
      res.json(updatedNutrition);
    } catch (error) {
      logger.error('Error updating nutrition for scaling:', error);
      next(error);
    }
  }
  
  /**
   * Calculate nutritional information for a recipe with ingredient substitutions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async calculateNutritionWithSubstitutions(req, res, next) {
    try {
      const { recipeId } = req.params;
      const { substitutions } = req.body;
      
      if (!recipeId || !substitutions || !Array.isArray(substitutions)) {
        return res.status(400).json({
          error: {
            message: 'Missing or invalid parameters: recipeId and substitutions array are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const updatedNutrition = await NutritionCalculationService.calculateNutritionWithSubstitutions(
        recipeId,
        substitutions,
        tenantId
      );
      
      res.json(updatedNutrition);
    } catch (error) {
      logger.error('Error calculating nutrition with substitutions:', error);
      next(error);
    }
  }
  
  /**
   * Calculate nutritional information for a meal plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async calculateMealPlanNutrition(req, res, next) {
    try {
      const { mealPlanId } = req.params;
      
      if (!mealPlanId) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: mealPlanId',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const mealPlanNutrition = await NutritionCalculationService.calculateMealPlanNutrition(
        mealPlanId,
        tenantId
      );
      
      res.json(mealPlanNutrition);
    } catch (error) {
      logger.error('Error calculating meal plan nutrition:', error);
      next(error);
    }
  }
  
  /**
   * Compare nutritional information against dietary goals
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async compareNutritionToDietaryGoals(req, res, next) {
    try {
      const { mealPlanId } = req.params;
      const { memberId } = req.body;
      
      if (!mealPlanId || !memberId) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: mealPlanId and memberId',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const comparison = await NutritionCalculationService.compareNutritionToDietaryGoals(
        memberId,
        mealPlanId,
        tenantId
      );
      
      res.json(comparison);
    } catch (error) {
      logger.error('Error comparing nutrition to dietary goals:', error);
      next(error);
    }
  }
}

module.exports = NutritionCalculationController;
