const express = require('express');
const { authenticateJWT, checkTenant } = require('../middleware/auth');
const pantryItemController = require('../controllers/pantryItem.controller');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateJWT);
router.use(checkTenant);

/**
 * @route GET /api/pantry
 * @desc Get all pantry items for current user's household
 * @access Private
 */
router.get('/', pantryItemController.getPantryItems);

/**
 * @route GET /api/pantry/expiring
 * @desc Get soon-to-expire pantry items
 * @access Private
 */
router.get('/expiring', pantryItemController.getExpiringItems);

/**
 * @route GET /api/pantry/:id
 * @desc Get a pantry item by ID
 * @access Private
 */
router.get('/:id', pantryItemController.getPantryItemById);

/**
 * @route POST /api/pantry
 * @desc Add a new pantry item
 * @access Private
 */
router.post('/', pantryItemController.addPantryItem);

/**
 * @route POST /api/pantry/bulk
 * @desc Add multiple pantry items at once
 * @access Private
 */
router.post('/bulk', pantryItemController.bulkAddPantryItems);

/**
 * @route PUT /api/pantry/:id
 * @desc Update a pantry item
 * @access Private
 */
router.put('/:id', pantryItemController.updatePantryItem);

/**
 * @route DELETE /api/pantry/:id
 * @desc Delete a pantry item
 * @access Private
 */
router.delete('/:id', pantryItemController.deletePantryItem);

/**
 * @route GET /api/pantry/check/:ingredientId
 * @desc Check if household has enough of an ingredient
 * @access Private
 */
router.get('/check/:ingredientId', pantryItemController.checkIngredientAvailability);

module.exports = router;