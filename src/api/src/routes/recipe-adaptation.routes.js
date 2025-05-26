const express = require('express');
const { RecipeAdaptationController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/recipe-adaptation/adapt
 * @desc Adapt a recipe based on specified criteria
 * @access Private
 */
router.post(
  '/adapt',
  authMiddleware,
  RecipeAdaptationController.adaptRecipe
);

/**
 * @route POST /api/recipe-adaptation/recipes/:recipeId/scale
 * @desc Scale a recipe to a different serving size
 * @access Private
 */
router.post(
  '/recipes/:recipeId/scale',
  authMiddleware,
  RecipeAdaptationController.scaleRecipe
);

/**
 * @route POST /api/recipe-adaptation/recipes/:recipeId/substitutions
 * @desc Find substitutions for an ingredient
 * @access Private
 */
router.post(
  '/recipes/:recipeId/substitutions',
  authMiddleware,
  RecipeAdaptationController.findIngredientSubstitutions
);

/**
 * @route POST /api/recipe-adaptation/recipes/:recipeId/personalize
 * @desc Create a personalized variant of a recipe
 * @access Private
 */
router.post(
  '/recipes/:recipeId/personalize',
  authMiddleware,
  RecipeAdaptationController.createPersonalizedVariant
);

module.exports = router;
