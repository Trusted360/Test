const { RecipeService } = require('../services');
const logger = require('../utils/logger');

/**
 * Recipe controller
 */
class RecipeController {
  /**
   * Create a new recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async createRecipe(req, res, next) {
    try {
      const { 
        name, 
        description, 
        instructions, 
        prepTime, 
        cookTime, 
        servings, 
        difficulty, 
        sourceUrl, 
        imageUrl, 
        tags 
      } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!name || !instructions) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: name and instructions are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const recipeData = {
        name,
        description,
        instructions,
        prepTime,
        cookTime,
        servings,
        difficulty,
        sourceUrl,
        imageUrl,
        tags
      };
      
      const recipe = await RecipeService.createRecipe(recipeData, tenantId);
      
      res.status(201).json(recipe);
    } catch (error) {
      logger.error('Error in createRecipe controller:', error);
      next(error);
    }
  }

  /**
   * Get a recipe by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getRecipe(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const recipe = await RecipeService.getRecipe(id, tenantId);
      
      res.json(recipe);
    } catch (error) {
      logger.error(`Error in getRecipe controller for ID ${req.params.id}:`, error);
      
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
   * Search recipes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async searchRecipes(req, res, next) {
    try {
      const { 
        search, 
        tags, 
        difficulty, 
        minRating, 
        maxPrepTime, 
        maxTotalTime, 
        ingredients,
        sortBy,
        sortDirection,
        limit, 
        offset 
      } = req.query;
      const tenantId = req.user.tenantId;
      
      // Parse tags if provided as comma-separated string
      const parsedTags = tags ? tags.split(',').map(tag => tag.trim()) : undefined;
      
      // Parse ingredients if provided as comma-separated string
      const parsedIngredients = ingredients ? ingredients.split(',').map(ingredient => ingredient.trim()) : undefined;
      
      // Parse numeric parameters
      const parsedMinRating = minRating ? parseFloat(minRating) : undefined;
      const parsedMaxPrepTime = maxPrepTime ? parseInt(maxPrepTime, 10) : undefined;
      const parsedMaxTotalTime = maxTotalTime ? parseInt(maxTotalTime, 10) : undefined;
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const parsedOffset = offset ? parseInt(offset, 10) : undefined;
      
      const options = {
        search,
        tags: parsedTags,
        difficulty,
        minRating: parsedMinRating,
        maxPrepTime: parsedMaxPrepTime,
        maxTotalTime: parsedMaxTotalTime,
        ingredients: parsedIngredients,
        sortBy,
        sortDirection,
        limit: parsedLimit,
        offset: parsedOffset
      };
      
      const result = await RecipeService.searchRecipes(options, tenantId);
      
      res.json(result);
    } catch (error) {
      logger.error('Error in searchRecipes controller:', error);
      next(error);
    }
  }

  /**
   * Get recipe suggestions for autocomplete
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getRecipeSuggestions(req, res, next) {
    try {
      const { term } = req.query;
      const tenantId = req.user.tenantId;
      
      if (!term || term.length < 2) {
        return res.json([]);
      }
      
      const suggestions = await RecipeService.getRecipeSuggestions(term, tenantId);
      
      res.json(suggestions);
    } catch (error) {
      logger.error('Error in getRecipeSuggestions controller:', error);
      next(error);
    }
  }

  /**
   * Update a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateRecipe(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        name, 
        description, 
        instructions, 
        prepTime, 
        cookTime, 
        servings, 
        difficulty, 
        sourceUrl, 
        imageUrl, 
        tags 
      } = req.body;
      const tenantId = req.user.tenantId;
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (instructions !== undefined) updateData.instructions = instructions;
      if (prepTime !== undefined) updateData.prepTime = prepTime;
      if (cookTime !== undefined) updateData.cookTime = cookTime;
      if (servings !== undefined) updateData.servings = servings;
      if (difficulty !== undefined) updateData.difficulty = difficulty;
      if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (tags !== undefined) updateData.tags = tags;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: {
            message: 'No update parameters provided',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const recipe = await RecipeService.updateRecipe(id, updateData, tenantId);
      
      res.json(recipe);
    } catch (error) {
      logger.error(`Error in updateRecipe controller for ID ${req.params.id}:`, error);
      
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
   * Delete a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async deleteRecipe(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      await RecipeService.deleteRecipe(id, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in deleteRecipe controller for ID ${req.params.id}:`, error);
      
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
   * Add an ingredient to a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async addIngredient(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        ingredientId, 
        quantity, 
        unitId, 
        preparation, 
        optional 
      } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!ingredientId || quantity === undefined) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: ingredientId and quantity are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const ingredientData = {
        ingredientId,
        quantity,
        unitId,
        preparation,
        optional
      };
      
      const ingredient = await RecipeService.addIngredient(id, ingredientData, tenantId);
      
      res.status(201).json(ingredient);
    } catch (error) {
      logger.error(`Error in addIngredient controller for recipe ID ${req.params.id}:`, error);
      
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
   * Update a recipe ingredient
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateIngredient(req, res, next) {
    try {
      const { id, ingredientId } = req.params;
      const { 
        quantity, 
        unitId, 
        preparation, 
        optional 
      } = req.body;
      const tenantId = req.user.tenantId;
      
      // First check if recipe exists
      await RecipeService.getRecipe(id, tenantId);
      
      const updateData = {};
      if (quantity !== undefined) updateData.quantity = quantity;
      if (unitId !== undefined) updateData.unitId = unitId;
      if (preparation !== undefined) updateData.preparation = preparation;
      if (optional !== undefined) updateData.optional = optional;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: {
            message: 'No update parameters provided',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const ingredient = await RecipeService.updateIngredient(ingredientId, updateData, tenantId);
      
      res.json(ingredient);
    } catch (error) {
      logger.error(`Error in updateIngredient controller for ingredient ID ${req.params.ingredientId}:`, error);
      
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
   * Remove an ingredient from a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async removeIngredient(req, res, next) {
    try {
      const { id, ingredientId } = req.params;
      const tenantId = req.user.tenantId;
      
      // First check if recipe exists
      await RecipeService.getRecipe(id, tenantId);
      
      await RecipeService.removeIngredient(ingredientId, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in removeIngredient controller for ingredient ID ${req.params.ingredientId}:`, error);
      
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
   * Enrich a recipe with AI
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async enrichRecipe(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const recipe = await RecipeService.enrichRecipe(id, tenantId);
      
      res.json(recipe);
    } catch (error) {
      logger.error(`Error in enrichRecipe controller for ID ${req.params.id}:`, error);
      
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
}

module.exports = RecipeController;
