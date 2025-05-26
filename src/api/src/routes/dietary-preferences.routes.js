const express = require('express');
const router = express.Router();
const { DietaryPreferenceController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get a member's complete dietary profile
router.get('/members/:memberId/profile', DietaryPreferenceController.getMemberDietaryProfile);

// Get liked and disliked ingredients for a member
router.get('/members/:memberId/likes-dislikes', DietaryPreferenceController.getMemberLikesAndDislikes);

// Food allergies routes
router.get('/members/:memberId/allergies', DietaryPreferenceController.getMemberAllergies);
router.post('/members/:memberId/allergies', DietaryPreferenceController.addMemberAllergy);
router.put('/members/:memberId/allergies/:allergyId', DietaryPreferenceController.updateMemberAllergy);
router.delete('/members/:memberId/allergies/:allergyId', DietaryPreferenceController.removeMemberAllergy);

// Food preferences routes
router.get('/members/:memberId/preferences', DietaryPreferenceController.getMemberPreferences);
router.post('/members/:memberId/preferences', DietaryPreferenceController.setMemberPreference);
router.delete('/members/:memberId/preferences/:preferenceId', DietaryPreferenceController.removeMemberPreference);

module.exports = router;
