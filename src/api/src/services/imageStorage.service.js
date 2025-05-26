const logger = require('../utils/logger');
const { ImageStorageProvider } = require('../models');
const { RecipeImage } = require('../models');

/**
 * Image Storage Service
 */
class ImageStorageService {
  /**
   * Upload an image
   * @param {Object} data - Image data
   * @param {string} data.recipeId - Recipe ID
   * @param {string} data.providerId - Storage provider ID
   * @param {Buffer} data.imageBuffer - Image buffer
   * @param {string} data.mimeType - Image MIME type
   * @param {string} data.altText - Alt text for the image
   * @param {string} data.caption - Image caption
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Uploaded image
   */
  static async uploadImage(data, tenantId) {
    try {
      const { recipeId, providerId, imageBuffer, mimeType, altText, caption } = data;

      // Get storage provider
      const provider = await ImageStorageProvider.getById(providerId, tenantId);
      if (!provider) {
        throw new Error(`Storage provider not found: ${providerId}`);
      }

      // In a real implementation, this would:
      // 1. Upload the image to the storage provider
      // 2. Get the URL and storage path
      // 3. Create a recipe image record
      // For now, simulate the upload
      const storagePath = `recipes/${recipeId}/${Date.now()}.${mimeType.split('/')[1]}`;
      const url = `https://example.com/${storagePath}`;

      const imageData = {
        recipe_id: recipeId,
        url,
        alt_text: altText,
        caption,
        storage_provider_id: providerId,
        storage_path: storagePath,
        is_primary: false,
        tenant_id: tenantId
      };

      const image = await RecipeImage.create(imageData);
      logger.info(`Uploaded image for recipe ${recipeId}`);
      return image;
    } catch (error) {
      logger.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Delete an image
   * @param {string} imageId - Image ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteImage(imageId, tenantId) {
    try {
      // Get image
      const image = await RecipeImage.getById(imageId, tenantId);
      if (!image) {
        throw new Error(`Image not found: ${imageId}`);
      }

      // In a real implementation, this would:
      // 1. Delete the image from the storage provider
      // 2. Delete the recipe image record
      // For now, just delete the record
      await RecipeImage.delete(imageId, tenantId);

      logger.info(`Deleted image ${imageId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting image ${imageId}:`, error);
      throw error;
    }
  }

  /**
   * Set an image as primary
   * @param {string} imageId - Image ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated image
   */
  static async setPrimaryImage(imageId, tenantId) {
    try {
      // Get image
      const image = await RecipeImage.getById(imageId, tenantId);
      if (!image) {
        throw new Error(`Image not found: ${imageId}`);
      }

      // Set all other images for this recipe as non-primary
      await RecipeImage.query()
        .patch({ is_primary: false })
        .where({ recipe_id: image.recipe_id, tenant_id: tenantId });

      // Set this image as primary
      const updatedImage = await RecipeImage.update(imageId, { is_primary: true }, tenantId);

      logger.info(`Set image ${imageId} as primary for recipe ${image.recipe_id}`);
      return updatedImage;
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
      return await RecipeImage.getByRecipe(recipeId, tenantId);
    } catch (error) {
      logger.error(`Error getting images for recipe ${recipeId}:`, error);
      throw error;
    }
  }
}

module.exports = ImageStorageService; 