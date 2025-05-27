/**
 * Routes for managing tags and tag-related operations.
 */

const express = require('express');
const TagController = require('../controllers/tag.controller');

const router = express.Router();

// Basic tag CRUD operations
router.get('/', TagController.getTags);
router.post('/', TagController.createTag);
router.get('/categories', TagController.getTagCategories);
router.get('/popular', TagController.getPopularTags);
router.get('/hierarchy', TagController.getTagHierarchy);
router.get('/stats', TagController.getTagUsageStats);
router.get('/:id', TagController.getTag);
router.put('/:id', TagController.updateTag);
router.delete('/:id', TagController.deleteTag);

// Tag relationship operations
router.get('/:id/related', TagController.getRelatedTags);
router.post('/merge', TagController.mergeTags);

module.exports = router;
