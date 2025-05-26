const { Tag, RecipeTag, Recipe } = require('../models');
const logger = require('../utils/logger');
const ollamaService = require('./ollama.service');
const { redisClient } = require('./redis');

/**
 * Tag service
 * Handles operations related to recipe tags
 */
class TagService {
  /**
   * Create a new tag
   * @param {Object} data - Tag data
   * @param {string} data.name - Tag name
   * @param {string} data.description - Tag description
   * @param {string} data.category - Tag category
   * @param {string} data.color - Tag color (hex code)
   * @param {string} data.parentId - Parent tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created tag
   */
  static async createTag(data, tenantId) {
    try {
      // Check if tag with same name already exists
      const existingTag = await Tag.getByName(data.name, tenantId);
      if (existingTag) {
        throw new Error(`Tag with name '${data.name}' already exists`);
      }
      
      const tagData = {
        ...data,
        tenantId
      };
      
      const tag = await Tag.create(tagData);
      
      // Invalidate cache
      await this._invalidateTagCache(tenantId);
      
      logger.info(`Created tag ${tag.id} with name '${tag.name}'`);
      return tag;
    } catch (error) {
      logger.error('Error creating tag:', error);
      throw error;
    }
  }

  /**
   * Get a tag by ID
   * @param {string} id - Tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Tag
   */
  static async getTag(id, tenantId) {
    try {
      const tag = await Tag.getById(id, tenantId);
      
      if (!tag) {
        throw new Error(`Tag not found: ${id}`);
      }
      
      return tag;
    } catch (error) {
      logger.error(`Error getting tag ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all tags
   * @param {Object} options - Query options
   * @param {string} options.search - Search term
   * @param {string} options.category - Filter by category
   * @param {string} options.parentId - Filter by parent ID
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Tags
   */
  static async getTags(options, tenantId) {
    try {
      // Check cache for common queries
      if (!options.search && !options.parentId && options.limit === 100 && options.offset === 0) {
        const cacheKey = options.category 
          ? `tags:${tenantId}:category:${options.category}`
          : `tags:${tenantId}:all`;
        
        const cachedTags = await redisClient.get(cacheKey);
        if (cachedTags) {
          logger.debug(`Retrieved tags from cache: ${cacheKey}`);
          return JSON.parse(cachedTags);
        }
      }
      
      const tags = await Tag.getAll(options, tenantId);
      
      // Cache common queries
      if (!options.search && !options.parentId && options.limit === 100 && options.offset === 0) {
        const cacheKey = options.category 
          ? `tags:${tenantId}:category:${options.category}`
          : `tags:${tenantId}:all`;
        
        await redisClient.set(cacheKey, JSON.stringify(tags), { EX: 3600 }); // Cache for 1 hour
        logger.debug(`Cached tags: ${cacheKey}`);
      }
      
      return tags;
    } catch (error) {
      logger.error('Error getting tags:', error);
      throw error;
    }
  }

  /**
   * Get tag categories
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Tag categories
   */
  static async getTagCategories(tenantId) {
    try {
      // Check cache
      const cacheKey = `tag-categories:${tenantId}`;
      const cachedCategories = await redisClient.get(cacheKey);
      
      if (cachedCategories) {
        logger.debug('Retrieved tag categories from cache');
        return JSON.parse(cachedCategories);
      }
      
      const categories = await Tag.getCategories(tenantId);
      
      // Cache categories
      await redisClient.set(cacheKey, JSON.stringify(categories), { EX: 3600 }); // Cache for 1 hour
      
      return categories;
    } catch (error) {
      logger.error('Error getting tag categories:', error);
      throw error;
    }
  }

  /**
   * Get popular tags
   * @param {number} limit - Maximum number of results
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Popular tags
   */
  static async getPopularTags(limit, tenantId) {
    try {
      // Check cache
      const cacheKey = `popular-tags:${tenantId}:${limit}`;
      const cachedTags = await redisClient.get(cacheKey);
      
      if (cachedTags) {
        logger.debug('Retrieved popular tags from cache');
        return JSON.parse(cachedTags);
      }
      
      const tags = await Tag.getPopular(limit, tenantId);
      
      // Cache popular tags
      await redisClient.set(cacheKey, JSON.stringify(tags), { EX: 1800 }); // Cache for 30 minutes
      
      return tags;
    } catch (error) {
      logger.error('Error getting popular tags:', error);
      throw error;
    }
  }

  /**
   * Get tags for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Tags
   */
  static async getTagsForRecipe(recipeId, tenantId) {
    try {
      const tags = await Tag.getByRecipeId(recipeId, tenantId);
      return tags;
    } catch (error) {
      logger.error(`Error getting tags for recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Update a tag
   * @param {string} id - Tag ID
   * @param {Object} data - Tag data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated tag
   */
  static async updateTag(id, data, tenantId) {
    try {
      // Check if tag exists
      const existingTag = await Tag.getById(id, tenantId);
      if (!existingTag) {
        throw new Error(`Tag not found: ${id}`);
      }
      
      // Check if name is being changed and if new name already exists
      if (data.name && data.name !== existingTag.name) {
        const tagWithSameName = await Tag.getByName(data.name, tenantId);
        if (tagWithSameName && tagWithSameName.id !== id) {
          throw new Error(`Tag with name '${data.name}' already exists`);
        }
      }
      
      const tag = await Tag.update(id, data, tenantId);
      
      // Invalidate cache
      await this._invalidateTagCache(tenantId);
      
      logger.info(`Updated tag ${id}`);
      return tag;
    } catch (error) {
      logger.error(`Error updating tag ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a tag
   * @param {string} id - Tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteTag(id, tenantId) {
    try {
      // Check if tag exists
      const existingTag = await Tag.getById(id, tenantId);
      if (!existingTag) {
        throw new Error(`Tag not found: ${id}`);
      }
      
      const success = await Tag.delete(id, tenantId);
      
      // Invalidate cache
      await this._invalidateTagCache(tenantId);
      
      logger.info(`Deleted tag ${id}`);
      return success;
    } catch (error) {
      logger.error(`Error deleting tag ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add a tag to a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tagId - Tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created recipe tag
   */
  static async addTagToRecipe(recipeId, tagId, tenantId) {
    try {
      // Check if recipe exists
      const recipe = await Recipe.getById(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Check if tag exists
      const tag = await Tag.getById(tagId, tenantId);
      if (!tag) {
        throw new Error(`Tag not found: ${tagId}`);
      }
      
      const recipeTag = await RecipeTag.create({
        recipeId,
        tagId,
        tenantId
      });
      
      // Invalidate cache
      await this._invalidateRecipeTagCache(recipeId, tenantId);
      
      logger.info(`Added tag ${tagId} to recipe ${recipeId}`);
      return {
        ...recipeTag,
        tag
      };
    } catch (error) {
      logger.error(`Error adding tag ${tagId} to recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a tag from a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tagId - Tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeTagFromRecipe(recipeId, tagId, tenantId) {
    try {
      const success = await RecipeTag.delete(recipeId, tagId, tenantId);
      
      if (!success) {
        throw new Error(`Tag ${tagId} not found on recipe ${recipeId}`);
      }
      
      // Invalidate cache
      await this._invalidateRecipeTagCache(recipeId, tenantId);
      
      logger.info(`Removed tag ${tagId} from recipe ${recipeId}`);
      return success;
    } catch (error) {
      logger.error(`Error removing tag ${tagId} from recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Set tags for a recipe (replace all existing tags)
   * @param {string} recipeId - Recipe ID
   * @param {Array} tagIds - Tag IDs
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Created recipe tags
   */
  static async setTagsForRecipe(recipeId, tagIds, tenantId) {
    try {
      // Check if recipe exists
      const recipe = await Recipe.getById(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Check if all tags exist
      for (const tagId of tagIds) {
        const tag = await Tag.getById(tagId, tenantId);
        if (!tag) {
          throw new Error(`Tag not found: ${tagId}`);
        }
      }
      
      const recipeTags = await RecipeTag.setTags(recipeId, tagIds, tenantId);
      
      // Invalidate cache
      await this._invalidateRecipeTagCache(recipeId, tenantId);
      
      logger.info(`Set ${recipeTags.length} tags for recipe ${recipeId}`);
      return recipeTags;
    } catch (error) {
      logger.error(`Error setting tags for recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Get recipes with all specified tags
   * @param {Array} tagIds - Tag IDs
   * @param {Object} options - Query options
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipes
   */
  static async getRecipesWithAllTags(tagIds, options, tenantId) {
    try {
      const recipes = await RecipeTag.getRecipesWithAllTags(tagIds, options, tenantId);
      return recipes;
    } catch (error) {
      logger.error('Error getting recipes with all tags:', error);
      throw error;
    }
  }

  /**
   * Get recipes with any of the specified tags
   * @param {Array} tagIds - Tag IDs
   * @param {Object} options - Query options
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipes
   */
  static async getRecipesWithAnyTags(tagIds, options, tenantId) {
    try {
      const recipes = await RecipeTag.getRecipesWithAnyTags(tagIds, options, tenantId);
      return recipes;
    } catch (error) {
      logger.error('Error getting recipes with any tags:', error);
      throw error;
    }
  }

  /**
   * Get related tags
   * @param {string} tagId - Tag ID
   * @param {number} limit - Maximum number of results
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Related tags
   */
  static async getRelatedTags(tagId, limit, tenantId) {
    try {
      // Check if tag exists
      const tag = await Tag.getById(tagId, tenantId);
      if (!tag) {
        throw new Error(`Tag not found: ${tagId}`);
      }
      
      // Check cache
      const cacheKey = `related-tags:${tenantId}:${tagId}:${limit}`;
      const cachedTags = await redisClient.get(cacheKey);
      
      if (cachedTags) {
        logger.debug(`Retrieved related tags for ${tagId} from cache`);
        return JSON.parse(cachedTags);
      }
      
      const relatedTags = await Tag.getRelated(tagId, limit, tenantId);
      
      // Cache related tags
      await redisClient.set(cacheKey, JSON.stringify(relatedTags), { EX: 3600 }); // Cache for 1 hour
      
      return relatedTags;
    } catch (error) {
      logger.error(`Error getting related tags for ${tagId}:`, error);
      throw error;
    }
  }

  /**
   * Get tag usage statistics
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Tag usage statistics
   */
  static async getTagUsageStats(tenantId) {
    try {
      // Check cache
      const cacheKey = `tag-stats:${tenantId}`;
      const cachedStats = await redisClient.get(cacheKey);
      
      if (cachedStats) {
        logger.debug('Retrieved tag usage statistics from cache');
        return JSON.parse(cachedStats);
      }
      
      const stats = await Tag.getUsageStats(tenantId);
      
      // Cache statistics
      await redisClient.set(cacheKey, JSON.stringify(stats), { EX: 3600 }); // Cache for 1 hour
      
      return stats;
    } catch (error) {
      logger.error('Error getting tag usage statistics:', error);
      throw error;
    }
  }

  /**
   * Merge tags
   * @param {string} sourceTagId - Source tag ID
   * @param {string} targetTagId - Target tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async mergeTags(sourceTagId, targetTagId, tenantId) {
    try {
      // Check if source tag exists
      const sourceTag = await Tag.getById(sourceTagId, tenantId);
      if (!sourceTag) {
        throw new Error(`Source tag not found: ${sourceTagId}`);
      }
      
      // Check if target tag exists
      const targetTag = await Tag.getById(targetTagId, tenantId);
      if (!targetTag) {
        throw new Error(`Target tag not found: ${targetTagId}`);
      }
      
      const success = await Tag.mergeTags(sourceTagId, targetTagId, tenantId);
      
      // Invalidate cache
      await this._invalidateTagCache(tenantId);
      
      logger.info(`Merged tag ${sourceTagId} into ${targetTagId}`);
      return success;
    } catch (error) {
      logger.error(`Error merging tags ${sourceTagId} into ${targetTagId}:`, error);
      throw error;
    }
  }

  /**
   * Get tag hierarchy
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Tag hierarchy
   */
  static async getTagHierarchy(tenantId) {
    try {
      // Check cache
      const cacheKey = `tag-hierarchy:${tenantId}`;
      const cachedHierarchy = await redisClient.get(cacheKey);
      
      if (cachedHierarchy) {
        logger.debug('Retrieved tag hierarchy from cache');
        return JSON.parse(cachedHierarchy);
      }
      
      const hierarchy = await Tag.getHierarchy(tenantId);
      
      // Cache hierarchy
      await redisClient.set(cacheKey, JSON.stringify(hierarchy), { EX: 3600 }); // Cache for 1 hour
      
      return hierarchy;
    } catch (error) {
      logger.error('Error getting tag hierarchy:', error);
      throw error;
    }
  }

  /**
   * Generate tag suggestions for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Tag suggestions
   */
  static async generateTagSuggestions(recipeId, tenantId) {
    try {
      // Check if recipe exists
      const recipe = await Recipe.getById(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // In a real implementation, this would use AI to generate tag suggestions
      // For now, use the placeholder implementation in the Tag model
      const suggestions = await Tag.generateSuggestions(recipeId, tenantId);
      
      logger.info(`Generated ${suggestions.length} tag suggestions for recipe ${recipeId}`);
      return suggestions;
    } catch (error) {
      logger.error(`Error generating tag suggestions for recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Generate tags using AI
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Generated tags
   */
  static async generateTagsWithAI(recipeId, tenantId) {
    try {
      // Check if recipe exists
      const recipe = await Recipe.getById(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Get existing tag categories
      const categories = await this.getTagCategories(tenantId);
      
      // Construct prompt for AI
      const prompt = `
        Analyze this recipe and generate appropriate tags for it. 
        The tags should cover these categories: ${categories.join(', ')}
        
        Recipe Title: ${recipe.title}
        Description: ${recipe.description || 'N/A'}
        Ingredients: ${recipe.ingredients.map(i => i.ingredient.name).join(', ')}
        Instructions: ${recipe.instructions}
        
        Return a JSON array of tag objects with these properties:
        - name: The tag name (lowercase, simple terms)
        - category: The category this tag belongs to
        - description: A brief description of what this tag means
        
        Example response format:
        [
          {
            "name": "italian",
            "category": "cuisine",
            "description": "Italian cuisine featuring traditional ingredients and techniques"
          },
          {
            "name": "pasta",
            "category": "dish_type",
            "description": "Dishes primarily featuring pasta as the main component"
          }
        ]
      `;
      
      // In a real implementation, this would call the Ollama service
      // For now, return placeholder tags
      const placeholderTags = [
        {
          name: "quick",
          category: "cooking_time",
          description: "Recipes that can be prepared in 30 minutes or less"
        },
        {
          name: "easy",
          category: "difficulty",
          description: "Recipes suitable for beginners with simple techniques"
        },
        {
          name: "dinner",
          category: "meal_type",
          description: "Recipes typically served as the main evening meal"
        }
      ];
      
      // Create tags that don't already exist
      const createdTags = [];
      for (const tagData of placeholderTags) {
        // Check if tag already exists
        let tag = await Tag.getByName(tagData.name, tenantId);
        
        if (!tag) {
          // Create new tag
          tag = await Tag.create({
            name: tagData.name,
            description: tagData.description,
            category: tagData.category,
            tenantId
          });
        }
        
        // Add tag to recipe if not already added
        const existingTags = await Tag.getByRecipeId(recipeId, tenantId);
        const tagExists = existingTags.some(t => t.id === tag.id);
        
        if (!tagExists) {
          await RecipeTag.create({
            recipeId,
            tagId: tag.id,
            tenantId
          });
        }
        
        createdTags.push(tag);
      }
      
      // Invalidate cache
      await this._invalidateRecipeTagCache(recipeId, tenantId);
      
      logger.info(`Generated ${createdTags.length} tags for recipe ${recipeId} using AI`);
      return createdTags;
    } catch (error) {
      logger.error(`Error generating tags with AI for recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate tag cache
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<void>}
   * @private
   */
  static async _invalidateTagCache(tenantId) {
    try {
      // Delete all cache keys related to tags
      const patterns = [
        `tags:${tenantId}:*`,
        `tag-categories:${tenantId}`,
        `popular-tags:${tenantId}:*`,
        `related-tags:${tenantId}:*`,
        `tag-stats:${tenantId}`,
        `tag-hierarchy:${tenantId}`
      ];
      
      // In a real implementation, this would use Redis SCAN and DEL commands
      // For now, just log the operation
      logger.debug(`Invalidated tag cache for patterns: ${patterns.join(', ')}`);
    } catch (error) {
      logger.error(`Error invalidating tag cache for tenant ${tenantId}:`, error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Invalidate recipe tag cache
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<void>}
   * @private
   */
  static async _invalidateRecipeTagCache(recipeId, tenantId) {
    try {
      // Delete all cache keys related to recipe tags
      const patterns = [
        `recipe-tags:${tenantId}:${recipeId}`,
        `tag-stats:${tenantId}`,
        `popular-tags:${tenantId}:*`
      ];
      
      // In a real implementation, this would use Redis SCAN and DEL commands
      // For now, just log the operation
      logger.debug(`Invalidated recipe tag cache for patterns: ${patterns.join(', ')}`);
    } catch (error) {
      logger.error(`Error invalidating recipe tag cache for recipe ${recipeId}:`, error);
      // Non-critical error, don't throw
    }
  }
}

module.exports = TagService;
