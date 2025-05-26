const { RecipeAdaptationService } = require('../services');
const logger = require('../utils/logger');

/**
 * RecipeAdaptation controller
 * Handles recipe adaptation API endpoints
 */
class RecipeAdaptationController {
  /**
   * Adapt a recipe based on specified criteria
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async adaptRecipe(req, res, next) {
    try {
      const { recipeId, memberId, adaptationCriteria, createNewRecipe } = req.body;
      
      if (!recipeId || !memberId || !adaptationCriteria) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: recipeId, memberId, and adaptationCriteria are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const adaptedRecipe = await RecipeAdaptationService.adaptRecipe({
        recipeId,
        memberId,
        adaptationCriteria,
        createNewRecipe
      }, tenantId);
      
      res.json(adaptedRecipe);
    } catch (error) {
      logger.error('Error adapting recipe:', error);
      next(error);
    }
  }
  
  /**
   * Scale a recipe to a different serving size
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async scaleRecipe(req, res, next) {
    try {
      const { recipeId } = req.params;
      const { targetServings } = req.body;
      
      if (!targetServings || isNaN(targetServings) || targetServings <= 0) {
        return res.status(400).json({
          error: {
            message: 'Invalid targetServings: must be a positive number',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const scaledRecipe = await RecipeAdaptationService.scaleRecipe(
        recipeId,
        parseInt(targetServings, 10),
        tenantId
      );
      
      res.json(scaledRecipe);
    } catch (error) {
      logger.error('Error scaling recipe:', error);
      next(error);
    }
  }
  
  /**
   * Find substitutions for an ingredient
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async findIngredientSubstitutions(req, res, next) {
    try {
      const { recipeId } = req.params;
      const { ingredientName, memberId } = req.body;
      
      if (!ingredientName || !memberId) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: ingredientName and memberId are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const substitutions = await RecipeAdaptationService.findIngredientSubstitutions(
        recipeId,
        ingredientName,
        memberId,
        tenantId
      );
      
      res.json(substitutions);
    } catch (error) {
      logger.error('Error finding ingredient substitutions:', error);
      next(error);
    }
  }
  
  /**
   * Create a personalized variant of a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async createPersonalizedVariant(req, res, next) {
    try {
      const { recipeId } = req.params;
      const { memberId } = req.body;
      
      if (!memberId) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: memberId is required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const personalizedRecipe = await RecipeAdaptationService.createPersonalizedVariant(
        recipeId,
        memberId,
        tenantId
      );
      
      res.json(personalizedRecipe);
    } catch (error) {
      logger.error('Error creating personalized recipe variant:', error);
      next(error);
    }
  }
}

module.exports = RecipeAdaptationController;
