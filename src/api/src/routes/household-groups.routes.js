const express = require('express');
const router = express.Router();
const { HouseholdGroupController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

// Household Group Management
// GET /api/households/:householdId/groups - List all groups in a household
router.get('/households/:householdId/groups', authMiddleware, HouseholdGroupController.getHouseholdGroups);

// POST /api/households/:householdId/groups - Create a new group
router.post('/households/:householdId/groups', authMiddleware, HouseholdGroupController.createGroup);

// GET /api/groups/:groupId - Get group details
router.get('/groups/:id', authMiddleware, HouseholdGroupController.getGroup);

// PUT /api/groups/:groupId - Update group
router.put('/groups/:id', authMiddleware, HouseholdGroupController.updateGroup);

// DELETE /api/groups/:groupId - Delete group
router.delete('/groups/:id', authMiddleware, HouseholdGroupController.deleteGroup);

// Group Membership
// GET /api/groups/:groupId/members - List members in a group
router.get('/groups/:groupId/members', authMiddleware, HouseholdGroupController.getGroupMembers);

// POST /api/groups/:groupId/members/:memberId - Add member to group
router.post('/groups/:groupId/members/:memberId', authMiddleware, HouseholdGroupController.addMemberToGroup);

// DELETE /api/groups/:groupId/members/:memberId - Remove member from group
router.delete('/groups/:groupId/members/:memberId', authMiddleware, HouseholdGroupController.removeMemberFromGroup);

// PUT /api/groups/:groupId/members/:memberId/primary - Set member as primary for group
router.put('/groups/:groupId/members/:memberId/primary', authMiddleware, HouseholdGroupController.setPrimaryMember);

// GET /api/members/:memberId/groups - Get groups a member belongs to
router.get('/members/:memberId/groups', authMiddleware, HouseholdGroupController.getMemberGroups);

// Group Meal Plans
// GET /api/groups/:groupId/meal-plans - List meal plans for a group
router.get('/groups/:groupId/meal-plans', authMiddleware, HouseholdGroupController.getGroupMealPlans);

// POST /api/groups/:groupId/meal-plans/:mealPlanId - Associate a meal plan with a group
router.post('/groups/:groupId/meal-plans/:mealPlanId', authMiddleware, HouseholdGroupController.associateMealPlanWithGroup);

// GET /api/meal-plans/:mealPlanId/groups - Get groups associated with a meal plan
router.get('/meal-plans/:mealPlanId/groups', authMiddleware, HouseholdGroupController.getMealPlanGroups);

module.exports = router; 