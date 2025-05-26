const express = require('express');
const { RecipeRatingController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/recipe-ratings
 * @desc Rate a recipe
 * @access Private
 */
router.post(
  '/',
  authMiddleware,
  RecipeRatingController.rateRecipe
);

/**
 * @route GET /api/recipe-ratings/:id
 * @desc Get a rating by ID
 * @access Private
 */
router.get(
  '/:id',
  authMiddleware,
  RecipeRatingController.getRating
);

/**
 * @route GET /api/recipe-ratings/members/:memberId/recipes/:recipeId
 * @desc Get a member's rating for a recipe
 * @access Private
 */
router.get(
  '/members/:memberId/recipes/:recipeId',
  authMiddleware,
  RecipeRatingController.getMemberRating
);

/**
 * @route GET /api/recipe-ratings/recipes/:recipeId
 * @desc Get all ratings for a recipe
 * @access Private
 */
router.get(
  '/recipes/:recipeId',
  authMiddleware,
  RecipeRatingController.getRecipeRatings
);

/**
 * @route GET /api/recipe-ratings/recipes/:recipeId/average
 * @desc Get average rating for a recipe
 * @access Private
 */
router.get(
  '/recipes/:recipeId/average',
  authMiddleware,
  RecipeRatingController.getAverageRating
);

/**
 * @route GET /api/recipe-ratings/members/:memberId
 * @desc Get all ratings by a member
 * @access Private
 */
router.get(
  '/members/:memberId',
  authMiddleware,
  RecipeRatingController.getMemberRatings
);

/**
 * @route GET /api/recipe-ratings/top
 * @desc Get top rated recipes
 * @access Private
 */
router.get(
  '/top',
  authMiddleware,
  RecipeRatingController.getTopRatedRecipes
);

/**
 * @route DELETE /api/recipe-ratings/:id
 * @desc Delete a rating
 * @access Private
 */
router.delete(
  '/:id',
  authMiddleware,
  RecipeRatingController.deleteRating
);

module.exports = router;
