const express = require('express');
const router = express.Router();
const { DietTypeController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all diet types
router.get('/', DietTypeController.getAllDietTypes);

// Get a diet type by ID
router.get('/:id', DietTypeController.getDietType);

// Create a new diet type
router.post('/', DietTypeController.createDietType);

// Update a diet type
router.put('/:id', DietTypeController.updateDietType);

// Delete a diet type
router.delete('/:id', DietTypeController.deleteDietType);

module.exports = router;
