const express = require('express');
const { PreferenceLearningController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/preference-learning/ratings
 * @desc Learn from recipe rating
 * @access Private
 */
router.post(
  '/ratings',
  authMiddleware,
  PreferenceLearningController.learnFromRating
);

/**
 * @route GET /api/preference-learning/recommendations/:memberId
 * @desc Get personalized recipe recommendations for a member
 * @access Private
 */
router.get(
  '/recommendations/:memberId',
  authMiddleware,
  PreferenceLearningController.getRecommendations
);

/**
 * @route POST /api/preference-learning/meal-plans/:mealPlanId/enhance
 * @desc Enhance meal plan with learned preferences
 * @access Private
 */
router.post(
  '/meal-plans/:mealPlanId/enhance',
  authMiddleware,
  PreferenceLearningController.enhanceMealPlan
);

/**
 * @route GET /api/preference-learning/members/:memberId/analysis
 * @desc Analyze member preferences
 * @access Private
 */
router.get(
  '/members/:memberId/analysis',
  authMiddleware,
  PreferenceLearningController.analyzePreferences
);

module.exports = router;
