const { Model } = require('objection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * RecipeImage model
 */
class RecipeImage extends Model {
  static get tableName() {
    return 'recipe_images';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['recipe_id', 'url', 'tenant_id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        recipe_id: { type: 'string', format: 'uuid' },
        url: { type: 'string' },
        alt_text: { type: 'string' },
        caption: { type: 'string' },
        is_primary: { type: 'boolean' },
        storage_provider_id: { type: 'string', format: 'uuid' },
        storage_path: { type: 'string' },
        tenant_id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const Recipe = require('./recipe.model');
    const ImageStorageProvider = require('./imageStorageProvider.model');

    return {
      recipe: {
        relation: Model.BelongsToOneRelation,
        modelClass: Recipe,
        join: {
          from: 'recipe_images.recipe_id',
          to: 'recipes.id'
        }
      },
      storageProvider: {
        relation: Model.BelongsToOneRelation,
        modelClass: ImageStorageProvider,
        join: {
          from: 'recipe_images.storage_provider_id',
          to: 'image_storage_providers.id'
        }
      }
    };
  }

  /**
   * Create a new recipe image
   * @param {Object} data - Image data
   * @returns {Promise<Object>} Created image
   */
  static async create(data) {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const newImage = {
        id,
        ...data,
        created_at: now,
        updated_at: now
      };

      logger.info(`Created recipe image ${id}`);
      return newImage;
    } catch (error) {
      logger.error('Error creating recipe image:', error);
      throw error;
    }
  }

  /**
   * Get a recipe image by ID
   * @param {string} id - Image ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Image
   */
  static async getById(id, tenantId) {
    try {
      return await this.query()
        .where({ id, tenant_id: tenantId })
        .first();
    } catch (error) {
      logger.error(`Error getting recipe image ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all images for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Images
   */
  static async getByRecipe(recipeId, tenantId) {
    try {
      return await this.query()
        .where({ recipe_id: recipeId, tenant_id: tenantId })
        .orderBy('is_primary', 'desc')
        .orderBy('created_at', 'desc');
    } catch (error) {
      logger.error(`Error getting images for recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Update a recipe image
   * @param {string} id - Image ID
   * @param {Object} data - Image data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated image
   */
  static async update(id, data, tenantId) {
    try {
      const now = new Date().toISOString();
      
      const updatedImage = await this.query()
        .patchAndFetchById(id, {
          ...data,
          updated_at: now
        })
        .where('tenant_id', tenantId);

      if (!updatedImage) {
        throw new Error(`Recipe image not found: ${id}`);
      }

      logger.info(`Updated recipe image ${id}`);
      return updatedImage;
    } catch (error) {
      logger.error(`Error updating recipe image ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a recipe image
   * @param {string} id - Image ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      const deleted = await this.query()
        .delete()
        .where({ id, tenant_id: tenantId });

      if (!deleted) {
        throw new Error(`Recipe image not found: ${id}`);
      }

      logger.info(`Deleted recipe image ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting recipe image ${id}:`, error);
      throw error;
    }
  }
}

module.exports = RecipeImage; 