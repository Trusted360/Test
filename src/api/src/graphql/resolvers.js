const { AuthService, CookingAssistantService, RecipeService, MealPlanService } = require('../services');
const { CookingSession } = require('../models');
const logger = require('../utils/logger');

// GraphQL resolvers
const resolvers = {
  // Query resolvers
  me: async (_, { user }) => {
    if (!user) {
      throw new Error('Not authenticated');
    }
    return user;
  },
  
  cookingSession: async ({ id }, { tenantId }) => {
    try {
      return await CookingSession.getById(id, tenantId);
    } catch (error) {
      logger.error(`Error fetching cooking session ${id}:`, error);
      throw error;
    }
  },
  
  activeCookingSessions: async ({ memberId }, { tenantId, services }) => {
    try {
      if (!services?.cookingAssistantService) {
        throw new Error('Cooking assistant service not initialized');
      }
      return await services.cookingAssistantService.getActiveSessions(memberId, tenantId);
    } catch (error) {
      logger.error(`Error fetching active cooking sessions for member ${memberId}:`, error);
      throw error;
    }
  },
  
  cookingSessionMessages: async ({ sessionId }, { tenantId }) => {
    try {
      // Get the session first
      const session = await CookingSession.getById(sessionId, tenantId);
      if (!session) {
        throw new Error(`Cooking session not found: ${sessionId}`);
      }
      
      // Format messages into the expected structure
      return session.messages.map((msg, index) => ({
        id: `${sessionId}-${index}`,
        sessionId,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || session.startTime
      }));
    } catch (error) {
      logger.error(`Error fetching cooking session messages for session ${sessionId}:`, error);
      throw error;
    }
  },
  
  recipe: async ({ id }, { tenantId, services }) => {
    try {
      if (!services?.recipeService) {
        throw new Error('Recipe service not initialized');
      }
      return await services.recipeService.getRecipe(id, tenantId);
    } catch (error) {
      logger.error(`Error fetching recipe ${id}:`, error);
      throw error;
    }
  },
  
  recipes: async (args, { tenantId, services }) => {
    try {
      if (!services?.recipeService) {
        throw new Error('Recipe service not initialized');
      }
      
      const { 
        search, 
        tags, 
        difficulty, 
        minRating, 
        maxPrepTime, 
        maxTotalTime, 
        ingredients,
        sortBy,
        sortDirection,
        limit,
        offset
      } = args;
      
      const options = {
        search,
        tags,
        difficulty,
        minRating,
        maxPrepTime,
        maxTotalTime,
        ingredients,
        sortBy,
        sortDirection,
        limit,
        offset
      };
      
      const result = await services.recipeService.searchRecipes(options, tenantId);
      
      return {
        recipes: result.recipes,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Error searching recipes:', error);
      throw error;
    }
  },
  
  recipeSuggestions: async ({ term }, { tenantId, services }) => {
    try {
      if (!services?.recipeService) {
        throw new Error('Recipe service not initialized');
      }
      return await services.recipeService.getRecipeSuggestions(term, tenantId);
    } catch (error) {
      logger.error(`Error getting recipe suggestions:`, error);
      throw error;
    }
  },
  
  mealPlanConstraints: async ({ mealPlanId }, { tenantId, services }) => {
    try {
      if (!services?.mealPlanService) {
        throw new Error('Meal plan service not initialized');
      }
      return await services.mealPlanService.getMealPlanConstraints(mealPlanId, tenantId);
    } catch (error) {
      logger.error(`Error fetching meal plan constraints for ${mealPlanId}:`, error);
      throw error;
    }
  },
  
  // Mutation resolvers
  login: async ({ input }, { tenantId, services }) => {
    try {
      const { email, password } = input;
      console.log('[login] Attempting login for:', email, 'tenant:', tenantId);
      
      if (!services?.authService) {
        console.error('[login] Auth service not initialized');
        throw new Error('Auth service not initialized');
      }
      
      const result = await services.authService.login(email, password, tenantId);
      console.log('[login] Login successful for:', email);
      
      return {
        token: result.token,
        user: {
          ...result.user,
          name: result.user.firstName + ' ' + (result.user.lastName || '')
        }
      };
    } catch (error) {
      console.error('[login] Login error details:', error);
      logger.error('Login error:', error);
      throw error;
    }
  },
  
  register: async ({ input }, { tenantId, services }) => {
    try {
      console.log('[register] Registration attempt with input:', {...input, password: '********'});
      console.log('[register] Using tenant ID:', tenantId);
      
      if (!services?.authService) {
        console.error('[register] Auth service not initialized');
        throw new Error('Auth service not initialized');
      }
      
      const result = await services.authService.register(input, tenantId);
      
      console.log('[register] Registration successful, generated token and user:', 
        { token: result.token ? 'Token generated' : 'No token', userId: result.user?.id });
      
      return {
        token: result.token,
        user: {
          ...result.user,
          name: result.user.firstName + ' ' + (result.user.lastName || '')
        }
      };
    } catch (error) {
      console.error('[register] Registration error details:', error);
      logger.error('Registration error:', error);
      throw error;
    }
  },
  
  startCookingSession: async ({ input }, { tenantId, services }) => {
    try {
      if (!services?.cookingAssistantService) {
        throw new Error('Cooking assistant service not initialized');
      }
      
      const { memberId, recipeId } = input;
      return await services.cookingAssistantService.startSession({ memberId, recipeId }, tenantId);
    } catch (error) {
      logger.error('Error starting cooking session:', error);
      throw error;
    }
  },
  
  sendCookingMessage: async ({ input }, { tenantId, services }) => {
    try {
      if (!services?.cookingAssistantService) {
        throw new Error('Cooking assistant service not initialized');
      }
      
      const { sessionId, message } = input;
      return await services.cookingAssistantService.sendMessage(sessionId, message, tenantId);
    } catch (error) {
      logger.error(`Error sending message to cooking assistant:`, error);
      throw error;
    }
  },
  
  getNextCookingStep: async ({ sessionId }, { tenantId, services }) => {
    try {
      if (!services?.cookingAssistantService) {
        throw new Error('Cooking assistant service not initialized');
      }
      
      return await services.cookingAssistantService.getNextStep(sessionId, tenantId);
    } catch (error) {
      logger.error(`Error getting next step:`, error);
      throw error;
    }
  },
  
  getPreviousCookingStep: async ({ sessionId }, { tenantId, services }) => {
    try {
      if (!services?.cookingAssistantService) {
        throw new Error('Cooking assistant service not initialized');
      }
      
      return await services.cookingAssistantService.getPreviousStep(sessionId, tenantId);
    } catch (error) {
      logger.error(`Error getting previous step:`, error);
      throw error;
    }
  },
  
  getIngredientSubstitutions: async ({ input }, { tenantId, services }) => {
    try {
      if (!services?.cookingAssistantService) {
        throw new Error('Cooking assistant service not initialized');
      }
      
      const { sessionId, ingredient } = input;
      return await services.cookingAssistantService.getIngredientSubstitutions(sessionId, ingredient, tenantId);
    } catch (error) {
      logger.error(`Error getting ingredient substitutions:`, error);
      throw error;
    }
  },
  
  endCookingSession: async ({ input }, { tenantId, services }) => {
    try {
      if (!services?.cookingAssistantService) {
        throw new Error('Cooking assistant service not initialized');
      }
      
      const { sessionId, rating, feedback } = input;
      return await services.cookingAssistantService.endSession(sessionId, { rating, feedback }, tenantId);
    } catch (error) {
      logger.error(`Error ending cooking session:`, error);
      throw error;
    }
  },
  
  updateMealPlanConstraints: async ({ mealPlanId, input }, { tenantId, services }) => {
    try {
      if (!services?.mealPlanService) {
        throw new Error('Meal plan service not initialized');
      }
      return await services.mealPlanService.updateMealPlanConstraints(mealPlanId, input, tenantId);
    } catch (error) {
      logger.error(`Error updating meal plan constraints:`, error);
      throw error;
    }
  },
  
  generateMealPlan: async ({ input }, { tenantId, services }) => {
    try {
      if (!services?.mealPlanService) {
        throw new Error('Meal plan service not initialized');
      }
      
      const { 
        householdId, 
        days, 
        preferences, 
        dietaryRestrictions, 
        availableIngredients, 
        excludedIngredients 
      } = input;
      
      return await services.mealPlanService.generateMealPlan({
        householdId,
        days,
        preferences,
        dietaryRestrictions,
        availableIngredients,
        excludedIngredients
      }, tenantId);
    } catch (error) {
      logger.error('Error generating meal plan:', error);
      throw error;
    }
  },
  
  regenerateMealPlan: async ({ mealPlanId, input }, { tenantId, services }) => {
    try {
      if (!services?.mealPlanService) {
        throw new Error('Meal plan service not initialized');
      }
      
      return await services.mealPlanService.regenerateMealPlan(mealPlanId, input || {}, tenantId);
    } catch (error) {
      logger.error(`Error regenerating meal plan:`, error);
      throw error;
    }
  }
};

module.exports = resolvers;
