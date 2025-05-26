const { TagService } = require('../services');
const logger = require('../utils/logger');

/**
 * Tag controller
 * Handles HTTP requests related to recipe tags
 */
class TagController {
  /**
   * Create a new tag
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async createTag(req, res, next) {
    try {
      const { 
        name, 
        description, 
        category, 
        color, 
        parentId 
      } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!name) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: name',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tagData = {
        name,
        description,
        category,
        color,
        parentId
      };
      
      const tag = await TagService.createTag(tagData, tenantId);
      
      res.status(201).json(tag);
    } catch (error) {
      logger.error('Error in createTag controller:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: {
            message: error.message,
            code: 'DUPLICATE_ENTITY'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Get a tag by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getTag(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const tag = await TagService.getTag(id, tenantId);
      
      res.json(tag);
    } catch (error) {
      logger.error(`Error in getTag controller for ID ${req.params.id}:`, error);
      
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
   * Get all tags
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getTags(req, res, next) {
    try {
      const { search, category, parentId, limit, offset } = req.query;
      const tenantId = req.user.tenantId;
      
      // Parse limit and offset if provided
      const parsedLimit = limit ? parseInt(limit, 10) : 100;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;
      
      const options = {
        search,
        category,
        parentId,
        limit: parsedLimit,
        offset: parsedOffset
      };
      
      const tags = await TagService.getTags(options, tenantId);
      
      res.json(tags);
    } catch (error) {
      logger.error('Error in getTags controller:', error);
      next(error);
    }
  }

  /**
   * Get tag categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getTagCategories(req, res, next) {
    try {
      const tenantId = req.user.tenantId;
      
      const categories = await TagService.getTagCategories(tenantId);
      
      res.json(categories);
    } catch (error) {
      logger.error('Error in getTagCategories controller:', error);
      next(error);
    }
  }

  /**
   * Get popular tags
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getPopularTags(req, res, next) {
    try {
      const { limit } = req.query;
      const tenantId = req.user.tenantId;
      
      // Parse limit if provided
      const parsedLimit = limit ? parseInt(limit, 10) : 20;
      
      const tags = await TagService.getPopularTags(parsedLimit, tenantId);
      
      res.json(tags);
    } catch (error) {
      logger.error('Error in getPopularTags controller:', error);
      next(error);
    }
  }

  /**
   * Get tags for a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getTagsForRecipe(req, res, next) {
    try {
      const { recipeId } = req.params;
      const tenantId = req.user.tenantId;
      
      const tags = await TagService.getTagsForRecipe(recipeId, tenantId);
      
      res.json(tags);
    } catch (error) {
      logger.error(`Error in getTagsForRecipe controller for recipe ID ${req.params.recipeId}:`, error);
      
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
   * Update a tag
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateTag(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        name, 
        description, 
        category, 
        color, 
        parentId 
      } = req.body;
      const tenantId = req.user.tenantId;
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (color !== undefined) updateData.color = color;
      if (parentId !== undefined) updateData.parentId = parentId;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: {
            message: 'No update parameters provided',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tag = await TagService.updateTag(id, updateData, tenantId);
      
      res.json(tag);
    } catch (error) {
      logger.error(`Error in updateTag controller for ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: {
            message: error.message,
            code: 'DUPLICATE_ENTITY'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Delete a tag
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async deleteTag(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      await TagService.deleteTag(id, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in deleteTag controller for ID ${req.params.id}:`, error);
      
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
   * Add a tag to a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async addTagToRecipe(req, res, next) {
    try {
      const { recipeId, tagId } = req.params;
      const tenantId = req.user.tenantId;
      
      const recipeTag = await TagService.addTagToRecipe(recipeId, tagId, tenantId);
      
      res.status(201).json(recipeTag);
    } catch (error) {
      logger.error(`Error in addTagToRecipe controller for recipe ID ${req.params.recipeId} and tag ID ${req.params.tagId}:`, error);
      
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
   * Remove a tag from a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async removeTagFromRecipe(req, res, next) {
    try {
      const { recipeId, tagId } = req.params;
      const tenantId = req.user.tenantId;
      
      await TagService.removeTagFromRecipe(recipeId, tagId, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in removeTagFromRecipe controller for recipe ID ${req.params.recipeId} and tag ID ${req.params.tagId}:`, error);
      
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
   * Set tags for a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async setTagsForRecipe(req, res, next) {
    try {
      const { recipeId } = req.params;
      const { tagIds } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!Array.isArray(tagIds)) {
        return res.status(400).json({
          error: {
            message: 'tagIds must be an array',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const recipeTags = await TagService.setTagsForRecipe(recipeId, tagIds, tenantId);
      
      res.json(recipeTags);
    } catch (error) {
      logger.error(`Error in setTagsForRecipe controller for recipe ID ${req.params.recipeId}:`, error);
      
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
   * Get recipes with all specified tags
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getRecipesWithAllTags(req, res, next) {
    try {
      const { tagIds } = req.body;
      const { limit, offset } = req.query;
      const tenantId = req.user.tenantId;
      
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({
          error: {
            message: 'tagIds must be a non-empty array',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      // Parse limit and offset if provided
      const parsedLimit = limit ? parseInt(limit, 10) : 20;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;
      
      const options = {
        limit: parsedLimit,
        offset: parsedOffset
      };
      
      const recipes = await TagService.getRecipesWithAllTags(tagIds, options, tenantId);
      
      res.json(recipes);
    } catch (error) {
      logger.error('Error in getRecipesWithAllTags controller:', error);
      next(error);
    }
  }

  /**
   * Get recipes with any of the specified tags
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getRecipesWithAnyTags(req, res, next) {
    try {
      const { tagIds } = req.body;
      const { limit, offset } = req.query;
      const tenantId = req.user.tenantId;
      
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({
          error: {
            message: 'tagIds must be a non-empty array',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      // Parse limit and offset if provided
      const parsedLimit = limit ? parseInt(limit, 10) : 20;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;
      
      const options = {
        limit: parsedLimit,
        offset: parsedOffset
      };
      
      const recipes = await TagService.getRecipesWithAnyTags(tagIds, options, tenantId);
      
      res.json(recipes);
    } catch (error) {
      logger.error('Error in getRecipesWithAnyTags controller:', error);
      next(error);
    }
  }

  /**
   * Get related tags
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getRelatedTags(req, res, next) {
    try {
      const { id } = req.params;
      const { limit } = req.query;
      const tenantId = req.user.tenantId;
      
      // Parse limit if provided
      const parsedLimit = limit ? parseInt(limit, 10) : 10;
      
      const relatedTags = await TagService.getRelatedTags(id, parsedLimit, tenantId);
      
      res.json(relatedTags);
    } catch (error) {
      logger.error(`Error in getRelatedTags controller for tag ID ${req.params.id}:`, error);
      
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
   * Get tag usage statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getTagUsageStats(req, res, next) {
    try {
      const tenantId = req.user.tenantId;
      
      const stats = await TagService.getTagUsageStats(tenantId);
      
      res.json(stats);
    } catch (error) {
      logger.error('Error in getTagUsageStats controller:', error);
      next(error);
    }
  }

  /**
   * Merge tags
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async mergeTags(req, res, next) {
    try {
      const { sourceTagId, targetTagId } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!sourceTagId || !targetTagId) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: sourceTagId and targetTagId',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      await TagService.mergeTags(sourceTagId, targetTagId, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error('Error in mergeTags controller:', error);
      
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
   * Get tag hierarchy
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getTagHierarchy(req, res, next) {
    try {
      const tenantId = req.user.tenantId;
      
      const hierarchy = await TagService.getTagHierarchy(tenantId);
      
      res.json(hierarchy);
    } catch (error) {
      logger.error('Error in getTagHierarchy controller:', error);
      next(error);
    }
  }

  /**
   * Generate tag suggestions for a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async generateTagSuggestions(req, res, next) {
    try {
      const { recipeId } = req.params;
      const tenantId = req.user.tenantId;
      
      const suggestions = await TagService.generateTagSuggestions(recipeId, tenantId);
      
      res.json(suggestions);
    } catch (error) {
      logger.error(`Error in generateTagSuggestions controller for recipe ID ${req.params.recipeId}:`, error);
      
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
   * Generate tags using AI
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async generateTagsWithAI(req, res, next) {
    try {
      const { recipeId } = req.params;
      const tenantId = req.user.tenantId;
      
      const tags = await TagService.generateTagsWithAI(recipeId, tenantId);
      
      res.json(tags);
    } catch (error) {
      logger.error(`Error in generateTagsWithAI controller for recipe ID ${req.params.recipeId}:`, error);
      
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

module.exports = TagController;
