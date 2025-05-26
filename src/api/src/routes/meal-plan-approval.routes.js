const express = require('express');
const { MealPlanApprovalController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/meal-plans/:id/submit
 * @desc Submit a meal plan for approval
 * @access Private
 */
router.post('/meal-plans/:id/submit', authMiddleware, MealPlanApprovalController.submitMealPlanForApproval);

/**
 * @route GET /api/meal-plans/:id/versions
 * @desc Get all versions of a meal plan
 * @access Private
 */
router.get('/meal-plans/:id/versions', authMiddleware, MealPlanApprovalController.getMealPlanVersions);

/**
 * @route GET /api/meal-plans/:id/versions/:versionNumber/approval
 * @desc Get approval details for a meal plan version
 * @access Private
 */
router.get('/meal-plans/:id/versions/:versionNumber/approval', authMiddleware, MealPlanApprovalController.getApprovalDetails);

/**
 * @route POST /api/meal-plans/:id/versions/:versionNumber/approve
 * @desc Submit an approval response for a meal plan
 * @access Private
 */
router.post('/meal-plans/:id/versions/:versionNumber/approve', authMiddleware, MealPlanApprovalController.submitApprovalResponse);

/**
 * @route POST /api/meal-plans/:id/versions/:versionNumber/comment
 * @desc Add a comment to a meal plan version
 * @access Private
 */
router.post('/meal-plans/:id/versions/:versionNumber/comment', authMiddleware, MealPlanApprovalController.addComment);

/**
 * @route POST /api/meal-plans/:id/revise
 * @desc Revise a meal plan based on feedback
 * @access Private
 */
router.post('/meal-plans/:id/revise', authMiddleware, MealPlanApprovalController.reviseMealPlan);

/**
 * @route POST /api/meal-plans/:id/finalize
 * @desc Finalize an approved meal plan
 * @access Private
 */
router.post('/meal-plans/:id/finalize', authMiddleware, MealPlanApprovalController.finalizeMealPlan);

module.exports = router;
