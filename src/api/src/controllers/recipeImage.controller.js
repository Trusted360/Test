const { RecipeImageService } = require('../services');
const logger = require('../utils/logger');

/**
 * Recipe Image Controller
 */
class RecipeImageController {
  /**
   * Upload a recipe image
   */
  static async uploadImage(req, res) {
    try {
      const { recipeId } = req.params;
      const { providerId, altText, caption } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const imageData = {
        recipeId,
        providerId,
        imageBuffer: req.file.buffer,
        mimeType: req.file.mimetype,
        altText,
        caption
      };

      const image = await RecipeImageService.addImage(imageData, req.tenantId);
      res.status(201).json(image);
    } catch (error) {
      logger.error('Error uploading recipe image:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete a recipe image
   */
  static async deleteImage(req, res) {
    try {
      const { imageId } = req.params;
      const success = await RecipeImageService.removeImage(imageId, req.tenantId);
      
      if (!success) {
        return res.status(404).json({ error: 'Image not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error(`Error deleting recipe image ${req.params.imageId}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update image details
   */
  static async updateImage(req, res) {
    try {
      const { imageId } = req.params;
      const image = await RecipeImageService.updateImage(imageId, req.body, req.tenantId);
      
      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }
      
      res.json(image);
    } catch (error) {
      logger.error(`Error updating recipe image ${req.params.imageId}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Set primary image
   */
  static async setPrimaryImage(req, res) {
    try {
      const { imageId } = req.params;
      const image = await RecipeImageService.setPrimaryImage(imageId, req.tenantId);
      
      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }
      
      res.json(image);
    } catch (error) {
      logger.error(`Error setting primary image ${req.params.imageId}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get recipe images
   */
  static async getRecipeImages(req, res) {
    try {
      const { recipeId } = req.params;
      const images = await RecipeImageService.getRecipeImages(recipeId, req.tenantId);
      res.json(images);
    } catch (error) {
      logger.error(`Error getting images for recipe ${req.params.recipeId}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get primary image
   */
  static async getPrimaryImage(req, res) {
    try {
      const { recipeId } = req.params;
      const image = await RecipeImageService.getPrimaryImage(recipeId, req.tenantId);
      
      if (!image) {
        return res.status(404).json({ error: 'No images found for recipe' });
      }
      
      res.json(image);
    } catch (error) {
      logger.error(`Error getting primary image for recipe ${req.params.recipeId}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = RecipeImageController; 