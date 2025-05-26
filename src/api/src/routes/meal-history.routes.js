const express = require('express');
const mealHistoryController = require('../controllers/mealHistory.controller');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Meal history routes
router.post('/', mealHistoryController.create);
router.get('/:id', mealHistoryController.getById);
router.put('/:id', mealHistoryController.update);
router.delete('/:id', mealHistoryController.delete);

// Meal history items routes
router.post('/:mealHistoryId/items', mealHistoryController.addItem);
router.put('/items/:itemId', mealHistoryController.updateItem);

// Feedback routes
router.post('/items/:itemId/feedback', mealHistoryController.addFeedback);
router.get('/items/:itemId/feedback', mealHistoryController.getFeedback);

// Household-specific routes
router.get('/household/:householdId', mealHistoryController.getByHouseholdId);
router.get('/household/:householdId/statistics', mealHistoryController.getStatistics);
router.get('/household/:householdId/insights', mealHistoryController.generateInsights);
router.get('/household/:householdId/popular-recipes', mealHistoryController.getPopularRecipes);

// Meal plan-specific routes
router.get('/meal-plan/:mealPlanId', mealHistoryController.getByMealPlanId);
router.post('/meal-plan/:mealPlanId/create', mealHistoryController.createFromMealPlan);

module.exports = router;
