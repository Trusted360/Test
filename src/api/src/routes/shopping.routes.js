const express = require('express');
const router = express.Router();
const { ShoppingListController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route POST /api/shopping/lists
 * @description Create a new shopping list
 * @access Private
 */
router.post('/lists', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.createShoppingList(req, res, next);
  } catch (error) {
    logger.error('Error in create shopping list route:', error);
    next(error);
  }
});

/**
 * @route GET /api/shopping/lists/:id
 * @description Get a shopping list by ID
 * @access Private
 */
router.get('/lists/:id', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.getShoppingList(req, res, next);
  } catch (error) {
    logger.error(`Error in get shopping list route for ID ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * @route GET /api/shopping/households/:householdId/lists
 * @description Get all shopping lists for a household
 * @access Private
 */
router.get('/households/:householdId/lists', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.getHouseholdShoppingLists(req, res, next);
  } catch (error) {
    logger.error(`Error in get household shopping lists route for household ID ${req.params.householdId}:`, error);
    next(error);
  }
});

/**
 * @route GET /api/shopping/households/:householdId/current-list
 * @description Get current shopping list for a household
 * @access Private
 */
router.get('/households/:householdId/current-list', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.getCurrentShoppingList(req, res, next);
  } catch (error) {
    logger.error(`Error in get current shopping list route for household ID ${req.params.householdId}:`, error);
    next(error);
  }
});

/**
 * @route PUT /api/shopping/lists/:id
 * @description Update a shopping list
 * @access Private
 */
router.put('/lists/:id', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.updateShoppingList(req, res, next);
  } catch (error) {
    logger.error(`Error in update shopping list route for ID ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * @route DELETE /api/shopping/lists/:id
 * @description Delete a shopping list
 * @access Private
 */
router.delete('/lists/:id', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.deleteShoppingList(req, res, next);
  } catch (error) {
    logger.error(`Error in delete shopping list route for ID ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * @route POST /api/shopping/lists/:id/items
 * @description Add an item to a shopping list
 * @access Private
 */
router.post('/lists/:id/items', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.addShoppingListItem(req, res, next);
  } catch (error) {
    logger.error(`Error in add shopping list item route for list ID ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * @route PUT /api/shopping/items/:id
 * @description Update a shopping list item
 * @access Private
 */
router.put('/items/:id', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.updateShoppingListItem(req, res, next);
  } catch (error) {
    logger.error(`Error in update shopping list item route for ID ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * @route PUT /api/shopping/items/:id/purchase
 * @description Mark a shopping list item as purchased or not purchased
 * @access Private
 */
router.put('/items/:id/purchase', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.markItemPurchased(req, res, next);
  } catch (error) {
    logger.error(`Error in mark item purchased route for ID ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * @route DELETE /api/shopping/items/:id
 * @description Remove an item from a shopping list
 * @access Private
 */
router.delete('/items/:id', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.removeShoppingListItem(req, res, next);
  } catch (error) {
    logger.error(`Error in remove shopping list item route for ID ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * @route POST /api/shopping/meal-plans/:mealPlanId/generate-list
 * @description Generate a shopping list from a meal plan
 * @access Private
 */
router.post('/meal-plans/:mealPlanId/generate-list', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.generateFromMealPlan(req, res, next);
  } catch (error) {
    logger.error(`Error in generate shopping list route for meal plan ID ${req.params.mealPlanId}:`, error);
    next(error);
  }
});

/**
 * @route GET /api/shopping/store-sections
 * @description Get all store sections
 * @access Private
 */
router.get('/store-sections', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.getStoreSections(req, res, next);
  } catch (error) {
    logger.error('Error in get store sections route:', error);
    next(error);
  }
});

/**
 * @route POST /api/shopping/store-sections
 * @description Create a new store section
 * @access Private
 */
router.post('/store-sections', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.createStoreSection(req, res, next);
  } catch (error) {
    logger.error('Error in create store section route:', error);
    next(error);
  }
});

/**
 * @route PUT /api/shopping/store-sections/:id
 * @description Update a store section
 * @access Private
 */
router.put('/store-sections/:id', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.updateStoreSection(req, res, next);
  } catch (error) {
    logger.error(`Error in update store section route for ID ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * @route DELETE /api/shopping/store-sections/:id
 * @description Delete a store section
 * @access Private
 */
router.delete('/store-sections/:id', authMiddleware, async (req, res, next) => {
  try {
    await ShoppingListController.deleteStoreSection(req, res, next);
  } catch (error) {
    logger.error(`Error in delete store section route for ID ${req.params.id}:`, error);
    next(error);
  }
});

module.exports = router;
