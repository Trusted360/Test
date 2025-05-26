const express = require('express');
const { NutritionCalculationController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   GET /api/nutrition/recipes/:recipeId
 * @desc    Calculate nutritional information for a recipe
 * @access  Private
 */
router.get('/recipes/:recipeId', NutritionCalculationController.calculateNutrition);

/**
 * @route   POST /api/nutrition/recipes/:recipeId/scale
 * @desc    Update nutritional information when a recipe is scaled
 * @access  Private
 */
router.post('/recipes/:recipeId/scale', NutritionCalculationController.updateNutritionForScaling);

/**
 * @route   POST /api/nutrition/recipes/:recipeId/substitutions
 * @desc    Calculate nutritional information for a recipe with ingredient substitutions
 * @access  Private
 */
router.post('/recipes/:recipeId/substitutions', NutritionCalculationController.calculateNutritionWithSubstitutions);

/**
 * @route   GET /api/nutrition/meal-plans/:mealPlanId
 * @desc    Calculate nutritional information for a meal plan
 * @access  Private
 */
router.get('/meal-plans/:mealPlanId', NutritionCalculationController.calculateMealPlanNutrition);

/**
 * @route   POST /api/nutrition/meal-plans/:mealPlanId/compare
 * @desc    Compare nutritional information against dietary goals
 * @access  Private
 */
router.post('/meal-plans/:mealPlanId/compare', NutritionCalculationController.compareNutritionToDietaryGoals);

module.exports = router;
