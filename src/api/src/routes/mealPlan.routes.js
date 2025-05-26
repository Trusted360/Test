const express = require('express');
const router = express.Router();
const { MealPlanController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route GET /api/meal-plans
 * @desc Get all meal plans for a household
 * @access Private
 */
router.get('/', authMiddleware, MealPlanController.getMealPlans);

/**
 * @route GET /api/meal-plans/:id
 * @desc Get a meal plan by ID
 * @access Private
 */
router.get('/:id', authMiddleware, MealPlanController.getMealPlan);

/**
 * @route POST /api/meal-plans
 * @desc Create a new meal plan
 * @access Private
 */
router.post('/', authMiddleware, MealPlanController.createMealPlan);

/**
 * @route PUT /api/meal-plans/:id
 * @desc Update a meal plan
 * @access Private
 */
router.put('/:id', authMiddleware, MealPlanController.updateMealPlan);

/**
 * @route DELETE /api/meal-plans/:id
 * @desc Delete a meal plan
 * @access Private
 */
router.delete('/:id', authMiddleware, MealPlanController.deleteMealPlan);

/**
 * @route POST /api/meal-plans/:id/generate
 * @desc Generate meal suggestions for a plan
 * @access Private
 */
router.post('/:id/generate', authMiddleware, MealPlanController.generateMealPlan);

/**
 * @route POST /api/meal-plans/:id/approve
 * @desc Approve a meal plan
 * @access Private
 */
router.post('/:id/approve', authMiddleware, MealPlanController.approveMealPlan);

/**
 * @route POST /api/meal-plans/:id/reject
 * @desc Reject a meal plan
 * @access Private
 */
router.post('/:id/reject', authMiddleware, MealPlanController.rejectMealPlan);

/**
 * @route GET /api/meal-plans/:id/shopping-list
 * @desc Get shopping list for a meal plan
 * @access Private
 */
router.get('/:id/shopping-list', authMiddleware, MealPlanController.getShoppingList);

module.exports = router; 