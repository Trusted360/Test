const express = require('express');
const router = express.Router();
const { RecipeImageController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route POST /api/images/recipes/:recipeId
 * @desc Upload a recipe image
 * @access Private
 */
router.post('/recipes/:recipeId', authMiddleware, upload.single('image'), RecipeImageController.uploadImage);

/**
 * @route DELETE /api/images/:imageId
 * @desc Delete a recipe image
 * @access Private
 */
router.delete('/:imageId', authMiddleware, RecipeImageController.deleteImage);

/**
 * @route PUT /api/images/:imageId
 * @desc Update image details
 * @access Private
 */
router.put('/:imageId', authMiddleware, RecipeImageController.updateImage);

/**
 * @route POST /api/images/:imageId/primary
 * @desc Set image as primary
 * @access Private
 */
router.post('/:imageId/primary', authMiddleware, RecipeImageController.setPrimaryImage);

/**
 * @route GET /api/images/recipes/:recipeId
 * @desc Get all images for a recipe
 * @access Private
 */
router.get('/recipes/:recipeId', authMiddleware, RecipeImageController.getRecipeImages);

/**
 * @route GET /api/images/recipes/:recipeId/primary
 * @desc Get primary image for a recipe
 * @access Private
 */
router.get('/recipes/:recipeId/primary', authMiddleware, RecipeImageController.getPrimaryImage);

module.exports = router; 