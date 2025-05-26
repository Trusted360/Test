const express = require('express');
const router = express.Router();
const { RecipeController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route GET /api/recipes
 * @desc Search recipes
 * @access Private
 */
router.get('/', authMiddleware, RecipeController.searchRecipes);

/**
 * @route GET /api/recipes/suggestions
 * @desc Get recipe search suggestions
 * @access Private
 */
router.get('/suggestions', authMiddleware, RecipeController.getRecipeSuggestions);

/**
 * @route GET /api/recipes/:id
 * @desc Get a recipe by ID
 * @access Private
 */
router.get('/:id', authMiddleware, RecipeController.getRecipe);

/**
 * @route POST /api/recipes
 * @desc Create a new recipe
 * @access Private
 */
router.post('/', authMiddleware, RecipeController.createRecipe);

/**
 * @route PUT /api/recipes/:id
 * @desc Update a recipe
 * @access Private
 */
router.put('/:id', authMiddleware, RecipeController.updateRecipe);

/**
 * @route DELETE /api/recipes/:id
 * @desc Delete a recipe
 * @access Private
 */
router.delete('/:id', authMiddleware, RecipeController.deleteRecipe);

/**
 * @route POST /api/recipes/:id/ingredients
 * @desc Add an ingredient to a recipe
 * @access Private
 */
router.post('/:id/ingredients', authMiddleware, RecipeController.addIngredient);

/**
 * @route PUT /api/recipes/:id/ingredients/:ingredientId
 * @desc Update a recipe ingredient
 * @access Private
 */
router.put('/:id/ingredients/:ingredientId', authMiddleware, RecipeController.updateIngredient);

/**
 * @route DELETE /api/recipes/:id/ingredients/:ingredientId
 * @desc Remove an ingredient from a recipe
 * @access Private
 */
router.delete('/:id/ingredients/:ingredientId', authMiddleware, RecipeController.removeIngredient);

/**
 * @route POST /api/recipes/:id/enrich
 * @desc Enrich a recipe with AI
 * @access Private
 */
router.post('/:id/enrich', authMiddleware, RecipeController.enrichRecipe);

module.exports = router;
