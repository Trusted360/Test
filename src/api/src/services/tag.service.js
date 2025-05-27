const { Tag } = require('../models');
const logger = require('../utils/logger');
const { redisClient } = require('./redis');

/**
 * Tag service
 * Handles operations related to tags for facilities, audits, and alerts
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
   * Invalidate tag cache
   * @param {string} tenantId - Tenant ID
   * @private
   */
  static async _invalidateTagCache(tenantId) {
    try {
      const keys = [
        `tags:${tenantId}:all`,
        `tag-categories:${tenantId}`,
        `tag-hierarchy:${tenantId}`,
        `tag-stats:${tenantId}`
      ];
      
      // Get all category-specific cache keys
      const categoryKeys = await redisClient.keys(`tags:${tenantId}:category:*`);
      keys.push(...categoryKeys);
      
      // Get all popular tag cache keys
      const popularKeys = await redisClient.keys(`popular-tags:${tenantId}:*`);
      keys.push(...popularKeys);
      
      // Get all related tag cache keys
      const relatedKeys = await redisClient.keys(`related-tags:${tenantId}:*`);
      keys.push(...relatedKeys);
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.debug(`Invalidated ${keys.length} tag cache keys for tenant ${tenantId}`);
      }
    } catch (error) {
      logger.error('Error invalidating tag cache:', error);
    }
  }
}

module.exports = TagService;
