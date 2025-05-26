/**
 * Preference Adjustment Routes
 * 
 * Routes for viewing and adjusting user preferences that have been learned by the system.
 */

const express = require('express');
const { PreferenceAdjustmentController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all learned preferences for a member
router.get('/members/:memberId/preferences', PreferenceAdjustmentController.getMemberPreferences);

// Get preference categories for organizing the preference UI
router.get('/preference-categories', PreferenceAdjustmentController.getPreferenceCategories);

// Update a specific preference for a member
router.put('/members/:memberId/preferences/:preferenceId', PreferenceAdjustmentController.updatePreference);

// Add a new preference for a member
router.post('/members/:memberId/preferences', PreferenceAdjustmentController.addPreference);

// Delete a preference for a member
router.delete('/members/:memberId/preferences/:preferenceId', PreferenceAdjustmentController.deletePreference);

// Reset all preferences for a member to system-learned defaults
router.post('/members/:memberId/preferences/reset', PreferenceAdjustmentController.resetPreferences);

// Get preference insights for a member
router.get('/members/:memberId/preference-insights', PreferenceAdjustmentController.getPreferenceInsights);

// Get preference conflicts between household members
router.get('/households/:householdId/preference-conflicts', PreferenceAdjustmentController.getHouseholdPreferenceConflicts);

module.exports = router;
