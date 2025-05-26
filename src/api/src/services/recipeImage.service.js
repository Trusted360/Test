const logger = require('../utils/logger');
const { RecipeImage } = require('../models');
const ImageStorageService = require('./imageStorage.service');

/**
 * Recipe Image Service
 */
class RecipeImageService {
  /**
   * Add an image to a recipe
   * @param {Object} data - Image data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created image
   */
  static async addImage(data, tenantId) {
    try {
      return await ImageStorageService.uploadImage(data, tenantId);
    } catch (error) {
      logger.error('Error adding recipe image:', error);
      throw error;
    }
  }

  /**
   * Remove an image from a recipe
   * @param {string} imageId - Image ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeImage(imageId, tenantId) {
    try {
      return await ImageStorageService.deleteImage(imageId, tenantId);
    } catch (error) {
      logger.error(`Error removing recipe image ${imageId}:`, error);
      throw error;
    }
  }

  /**
   * Update image details
   * @param {string} imageId - Image ID
   * @param {Object} data - Image data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated image
   */
  static async updateImage(imageId, data, tenantId) {
    try {
      const { altText, caption } = data;
      return await RecipeImage.update(imageId, { alt_text: altText, caption }, tenantId);
    } catch (error) {
      logger.error(`Error updating recipe image ${imageId}:`, error);
      throw error;
    }
  }

  /**
   * Set primary image for a recipe
   * @param {string} imageId - Image ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated image
   */
  static async setPrimaryImage(imageId, tenantId) {
    try {
      return await ImageStorageService.setPrimaryImage(imageId, tenantId);
    } catch (error) {
      logger.error(`Error setting primary image ${imageId}:`, error);
      throw error;
    }
  }

  /**
   * Get all images for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Images
   */
  static async getRecipeImages(recipeId, tenantId) {
    try {
      return await ImageStorageService.getRecipeImages(recipeId, tenantId);
    } catch (error) {
      logger.error(`Error getting images for recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Get primary image for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Primary image
   */
  static async getPrimaryImage(recipeId, tenantId) {
    try {
      const images = await this.getRecipeImages(recipeId, tenantId);
      return images.find(image => image.is_primary) || images[0] || null;
    } catch (error) {
      logger.error(`Error getting primary image for recipe ${recipeId}:`, error);
      throw error;
    }
  }
}

module.exports = RecipeImageService; 