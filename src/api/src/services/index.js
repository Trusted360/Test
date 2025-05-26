const AuthService = require('./auth.service');
const HouseholdService = require('./household.service');
const MemberService = require('./member.service');
const RecipeService = require('./recipe.service');
const MealPlanService = require('./mealPlan.service');
const MealPlanApprovalService = require('./mealPlanApproval.service');
const MealHistoryService = require('./mealHistory.service');
const ShoppingListService = require('./shoppingList.service');
const OllamaService = require('./ollama.service');
const RedisService = require('./redis');
const DietTypeService = require('./dietType.service');
const DietaryPreferenceService = require('./dietaryPreference.service');
const PreferenceAdjustmentService = require('./preferenceAdjustment.service');
const CookingAssistantService = require('./cookingAssistant.service');
const RecipeAdaptationService = require('./recipeAdaptation.service');
const NutritionCalculationService = require('./nutritionCalculation.service');
const NotificationService = require('./notification.service');
const TagService = require('./tag.service');
const ImageStorageService = require('./imageStorage.service');
const RecipeImageService = require('./recipeImage.service');
const RecipeRatingService = require('./recipeRating.service');
const PreferenceLearningService = require('./preferenceLearning.service');
const HouseholdGroupService = require('./householdGroup.service');

module.exports = {
  AuthService,
  HouseholdService,
  MemberService,
  RecipeService,
  MealPlanService,
  MealPlanApprovalService,
  MealHistoryService,
  ShoppingListService,
  OllamaService,
  RedisService,
  DietTypeService,
  DietaryPreferenceService,
  PreferenceAdjustmentService,
  CookingAssistantService,
  RecipeAdaptationService,
  NutritionCalculationService,
  NotificationService,
  TagService,
  ImageStorageService,
  RecipeImageService,
  RecipeRatingService,
  PreferenceLearningService,
  HouseholdGroupService
};
