const User = require('./user.model');
const Household = require('./household.model');
const Member = require('./member.model');
const Recipe = require('./recipe.model');
const MealPlan = require('./mealPlan.model');
const MealPlanApproval = require('./mealPlanApproval.model');
const MealHistory = require('./mealHistory.model');
const ShoppingList = require('./shoppingList.model');
const Unit = require('./unit.model');
const StoreSection = require('./storeSection.model');
const DietType = require('./dietType.model');
const FoodAllergy = require('./foodAllergy.model');
const FoodPreference = require('./foodPreference.model');
const RecipeRating = require('./recipeRating.model');
const Notification = require('./notification.model');
const NotificationRecipient = require('./notificationRecipient.model');
const NotificationChannel = require('./notificationChannel.model');
const NotificationDelivery = require('./notificationDelivery.model');
const NotificationTemplate = require('./notificationTemplate.model');
const NotificationPreference = require('./notificationPreference.model');
const Tag = require('./tag.model');
const RecipeTag = require('./recipeTag.model');
const RecipeImage = require('./recipeImage.model');
const ImageStorageProvider = require('./imageStorageProvider.model');
const CookingSession = require('./cookingSession.model');
const HouseholdGroup = require('./householdGroup.model');
const HouseholdGroupMember = require('./householdGroupMember.model');
const MealPlanGroup = require('./mealPlanGroup.model');

module.exports = {
  User,
  Household,
  Member,
  Recipe,
  MealPlan,
  MealPlanApproval,
  MealHistory,
  ShoppingList,
  Unit,
  StoreSection,
  DietType,
  FoodAllergy,
  FoodPreference,
  RecipeRating,
  Notification,
  NotificationRecipient,
  NotificationChannel,
  NotificationDelivery,
  NotificationTemplate,
  NotificationPreference,
  Tag,
  RecipeTag,
  RecipeImage,
  ImageStorageProvider,
  CookingSession,
  HouseholdGroup,
  HouseholdGroupMember,
  MealPlanGroup
};
