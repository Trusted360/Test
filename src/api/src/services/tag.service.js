const { Tag } = require('../models');
const logger = require('../utils/logger');

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
      const tags = await Tag.getAll(options, tenantId);
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
      const categories = await Tag.getCategories(tenantId);
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
      const tags = await Tag.getPopular(limit, tenantId);
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
      
      const relatedTags = await Tag.getRelated(tagId, limit, tenantId);
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
      const stats = await Tag.getUsageStats(tenantId);
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
      const hierarchy = await Tag.getHierarchy(tenantId);
      return hierarchy;
    } catch (error) {
      logger.error('Error getting tag hierarchy:', error);
      throw error;
    }
  }
}

module.exports = TagService;
