const express = require('express');

// Import route modules
const householdRoutes = require('./household.routes');
const recipeRoutes = require('./recipe.routes');
const mealPlanRoutes = require('./mealPlan.routes');
const mealPlanApprovalRoutes = require('./meal-plan-approval.routes');
const mealHistoryRoutes = require('./meal-history.routes');
const shoppingRoutes = require('./shopping.routes');
const authRoutesFn = require('./auth.routes'); // Renamed to indicate it's a function
const ollamaRoutes = require('./ollama.routes');
const dietTypesRoutes = require('./diet-types.routes');
const dietaryPreferencesRoutes = require('./dietary-preferences.routes');
const preferenceLearningRoutes = require('./preference-learning.routes');
const preferenceAdjustmentRoutes = require('./preferenceAdjustment.routes');
const recipeRatingRoutes = require('./recipe-rating.routes');
const cookingAssistantRoutes = require('./cooking-assistant.routes');
const recipeAdaptationRoutes = require('./recipe-adaptation.routes');
const nutritionCalculationRoutes = require('./nutrition-calculation.routes');
const notificationsRoutes = require('./notifications.routes');
const tagRoutes = require('./tag.routes');
const recipeImagesRoutes = require('./recipe-images.routes');
const pantryItemsRoutes = require('./pantryItems.routes');
const householdGroupsRoutes = require('./household-groups.routes');

module.exports = function(services) { // Function that accepts services
  const router = express.Router();
  const authRoutes = authRoutesFn(services);

  // Register routes
  router.use('/households', householdRoutes);
  router.use('/recipes', recipeRoutes);
  router.use('/meal-plans', mealPlanRoutes);
  router.use('/', mealPlanApprovalRoutes);
  router.use('/meal-history', mealHistoryRoutes);
  router.use('/shopping', shoppingRoutes);
  router.use('/auth', authRoutes);
  router.use('/ollama', ollamaRoutes);
  router.use('/diet-types', dietTypesRoutes);
  router.use('/dietary-preferences', dietaryPreferencesRoutes);
  router.use('/preference-learning', preferenceLearningRoutes);
  router.use('/preference-adjustment', preferenceAdjustmentRoutes);
  router.use('/recipe-ratings', recipeRatingRoutes);
  router.use('/cooking-assistant', cookingAssistantRoutes);
  router.use('/recipe-adaptation', recipeAdaptationRoutes);
  router.use('/nutrition', nutritionCalculationRoutes);
  router.use('/notifications', notificationsRoutes);
  router.use('/tags', tagRoutes);
  router.use('/images', recipeImagesRoutes);
  router.use('/pantry', pantryItemsRoutes);
  router.use('/', householdGroupsRoutes);

  // API version and status
  router.get('/', (req, res) => {
    res.json({
      name: 'Simmer API',
      version: '0.1.0',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // Test route without authentication
  router.get('/test', (req, res) => {
    res.json({
      test: 'ok',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  });

  return router;
}; // Close the function
