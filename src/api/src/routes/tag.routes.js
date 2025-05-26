/**
 * Tag Routes
 * 
 * Routes for managing recipe tags and tag-related operations.
 */

const express = require('express');
const { TagController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Tag management routes
router.post('/', TagController.createTag);
router.get('/', TagController.getTags);
router.get('/categories', TagController.getTagCategories);
router.get('/popular', TagController.getPopularTags);
router.get('/hierarchy', TagController.getTagHierarchy);
router.get('/stats', TagController.getTagUsageStats);
router.post('/merge', TagController.mergeTags);
router.get('/:id', TagController.getTag);
router.put('/:id', TagController.updateTag);
router.delete('/:id', TagController.deleteTag);
router.get('/:id/related', TagController.getRelatedTags);

// Recipe tag routes
router.get('/recipes/:recipeId', TagController.getTagsForRecipe);
router.post('/recipes/:recipeId', TagController.setTagsForRecipe);
router.post('/recipes/:recipeId/tags/:tagId', TagController.addTagToRecipe);
router.delete('/recipes/:recipeId/tags/:tagId', TagController.removeTagFromRecipe);
router.get('/recipes/:recipeId/suggestions', TagController.generateTagSuggestions);
router.post('/recipes/:recipeId/generate-ai', TagController.generateTagsWithAI);

// Recipe search by tags
router.post('/search/all', TagController.getRecipesWithAllTags);
router.post('/search/any', TagController.getRecipesWithAnyTags);

module.exports = router;
