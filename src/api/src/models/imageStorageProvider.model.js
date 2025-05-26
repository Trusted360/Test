const { Model } = require('objection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * ImageStorageProvider model
 */
class ImageStorageProvider extends Model {
  static get tableName() {
    return 'image_storage_providers';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'type', 'config', 'tenant_id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        type: { type: 'string', enum: ['s3', 'local', 'cloudinary', 'other'] },
        config: { type: 'object' },
        is_active: { type: 'boolean' },
        tenant_id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const RecipeImage = require('./recipeImage.model');

    return {
      images: {
        relation: Model.HasManyRelation,
        modelClass: RecipeImage,
        join: {
          from: 'image_storage_providers.id',
          to: 'recipe_images.storage_provider_id'
        }
      }
    };
  }

  /**
   * Create a new image storage provider
   * @param {Object} data - Provider data
   * @returns {Promise<Object>} Created provider
   */
  static async create(data) {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const newProvider = {
        id,
        ...data,
        is_active: data.is_active ?? true,
        created_at: now,
        updated_at: now
      };

      logger.info(`Created image storage provider ${id}`);
      return newProvider;
    } catch (error) {
      logger.error('Error creating image storage provider:', error);
      throw error;
    }
  }

  /**
   * Get a storage provider by ID
   * @param {string} id - Provider ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Provider
   */
  static async getById(id, tenantId) {
    try {
      return await this.query()
        .where({ id, tenant_id: tenantId })
        .first();
    } catch (error) {
      logger.error(`Error getting image storage provider ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all active storage providers for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Providers
   */
  static async getActiveProviders(tenantId) {
    try {
      return await this.query()
        .where({ tenant_id: tenantId, is_active: true })
        .orderBy('name');
    } catch (error) {
      logger.error(`Error getting active storage providers for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Update a storage provider
   * @param {string} id - Provider ID
   * @param {Object} data - Provider data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated provider
   */
  static async update(id, data, tenantId) {
    try {
      const now = new Date().toISOString();
      
      const updatedProvider = await this.query()
        .patchAndFetchById(id, {
          ...data,
          updated_at: now
        })
        .where('tenant_id', tenantId);

      if (!updatedProvider) {
        throw new Error(`Image storage provider not found: ${id}`);
      }

      logger.info(`Updated image storage provider ${id}`);
      return updatedProvider;
    } catch (error) {
      logger.error(`Error updating image storage provider ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a storage provider
   * @param {string} id - Provider ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      // Check if provider has any associated images
      const provider = await this.query()
        .findById(id)
        .where('tenant_id', tenantId)
        .withGraphFetched('images');

      if (!provider) {
        throw new Error(`Image storage provider not found: ${id}`);
      }

      if (provider.images && provider.images.length > 0) {
        throw new Error(`Cannot delete provider ${id}: has associated images`);
      }

      const deleted = await this.query()
        .delete()
        .where({ id, tenant_id: tenantId });

      logger.info(`Deleted image storage provider ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting image storage provider ${id}:`, error);
      throw error;
    }
  }
}

module.exports = ImageStorageProvider; 