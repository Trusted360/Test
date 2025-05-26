const { MealPlan } = require('../models');
const logger = require('../utils/logger');
const ollamaService = require('./ollama.service');
const preferenceLearningService = require('./preferenceLearning.service');

/**
 * MealPlan service
 */
class MealPlanService {
  /**
   * Create a new meal plan
   * @param {Object} data - Meal plan data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal plan
   */
  static async createMealPlan(data, tenantId) {
    try {
      const mealPlanData = {
        ...data,
        tenantId
      };
      
      const mealPlan = await MealPlan.create(mealPlanData);
      
      logger.info(`Created meal plan ${mealPlan.id}`);
      return mealPlan;
    } catch (error) {
      logger.error('Error creating meal plan:', error);
      throw error;
    }
  }

  /**
   * Get a meal plan by ID
   * @param {string} id - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Meal plan
   */
  static async getMealPlan(id, tenantId) {
    try {
      const mealPlan = await MealPlan.getById(id, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${id}`);
      }
      
      return mealPlan;
    } catch (error) {
      logger.error(`Error getting meal plan ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all meal plans for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Meal plans
   */
  static async getHouseholdMealPlans(householdId, tenantId) {
    try {
      const mealPlans = await MealPlan.getByHouseholdId(householdId, tenantId);
      return mealPlans;
    } catch (error) {
      logger.error(`Error getting meal plans for household ${householdId}:`, error);
      throw error;
    }
  }

  /**
   * Get current meal plan for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Current meal plan
   */
  static async getCurrentMealPlan(householdId, tenantId) {
    try {
      const mealPlan = await MealPlan.getCurrentForHousehold(householdId, tenantId);
      return mealPlan;
    } catch (error) {
      logger.error(`Error getting current meal plan for household ${householdId}:`, error);
      throw error;
    }
  }

  /**
   * Update a meal plan
   * @param {string} id - Meal plan ID
   * @param {Object} data - Meal plan data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated meal plan
   */
  static async updateMealPlan(id, data, tenantId) {
    try {
      const mealPlan = await MealPlan.update(id, data, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${id}`);
      }
      
      logger.info(`Updated meal plan ${id}`);
      return mealPlan;
    } catch (error) {
      logger.error(`Error updating meal plan ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a meal plan
   * @param {string} id - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteMealPlan(id, tenantId) {
    try {
      const success = await MealPlan.delete(id, tenantId);
      
      if (!success) {
        throw new Error(`Meal plan not found: ${id}`);
      }
      
      logger.info(`Deleted meal plan ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting meal plan ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add an item to a meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {Object} data - Meal plan item data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal plan item
   */
  static async addMealPlanItem(mealPlanId, data, tenantId) {
    try {
      // First check if meal plan exists
      const mealPlan = await MealPlan.getById(mealPlanId, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${mealPlanId}`);
      }
      
      const itemData = {
        ...data,
        mealPlanId,
        tenantId
      };
      
      const item = await MealPlan.addItem(itemData);
      
      logger.info(`Added item ${item.id} to meal plan ${mealPlanId}`);
      return item;
    } catch (error) {
      logger.error(`Error adding item to meal plan ${mealPlanId}:`, error);
      throw error;
    }
  }

  /**
   * Update a meal plan item
   * @param {string} id - Meal plan item ID
   * @param {Object} data - Meal plan item data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated meal plan item
   */
  static async updateMealPlanItem(id, data, tenantId) {
    try {
      const item = await MealPlan.updateItem(id, data, tenantId);
      
      if (!item) {
        throw new Error(`Meal plan item not found: ${id}`);
      }
      
      logger.info(`Updated meal plan item ${id}`);
      return item;
    } catch (error) {
      logger.error(`Error updating meal plan item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Remove an item from a meal plan
   * @param {string} id - Meal plan item ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeMealPlanItem(id, tenantId) {
    try {
      const success = await MealPlan.removeItem(id, tenantId);
      
      if (!success) {
        throw new Error(`Meal plan item not found: ${id}`);
      }
      
      logger.info(`Removed item ${id} from meal plan`);
      return true;
    } catch (error) {
      logger.error(`Error removing item ${id} from meal plan:`, error);
      throw error;
    }
  }

  /**
   * Generate a meal plan using AI
   * @param {Object} data - Generation data
   * @param {string} data.householdId - Household ID
   * @param {number} data.days - Number of days
   * @param {Array} data.preferences - Preferences
   * @param {Array} data.dietaryRestrictions - Dietary restrictions
   * @param {Array} data.availableIngredients - Available ingredients
   * @param {Array} data.excludedIngredients - Excluded ingredients
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Generated meal plan
   */
  static async generateMealPlan(data, tenantId) {
    try {
      const { 
        householdId, 
        days, 
        preferences = [],
        dietaryRestrictions = [], 
        availableIngredients = [],
        excludedIngredients = []
      } = data;
      
      // Get household members
      const members = await this._getHouseholdMembers(householdId, tenantId);
      
      // Get learned preferences for each member
      const memberPreferences = {};
      // Get dietary restrictions for each member
      const memberDietaryRestrictions = {};
      
      for (const member of members) {
        try {
          // Try to get learned preferences
          memberPreferences[member.id] = await preferenceLearningService._getMemberPreferences(member.id, tenantId);
          
          // Get dietary profile for member
          const dietaryProfile = await this._getMemberDietaryProfile(member.id, tenantId);
          memberDietaryRestrictions[member.id] = {
            allergies: dietaryProfile.allergies || [],
            diets: dietaryProfile.diets || [],
            restrictions: dietaryProfile.restrictions || []
          };
        } catch (prefError) {
          logger.warn(`Failed to get preferences/restrictions for member ${member.id}: ${prefError.message}`);
          memberPreferences[member.id] = [];
          memberDietaryRestrictions[member.id] = { allergies: [], diets: [], restrictions: [] };
        }
      }
      
      // Combine explicit preferences with learned preferences
      const enhancedPreferences = this._combinePreferences(preferences, memberPreferences);
      
      // Combine explicit restrictions with member dietary restrictions
      const enhancedRestrictions = this._combineDietaryRestrictions(dietaryRestrictions, memberDietaryRestrictions);
      
      try {
        // Try to use Ollama service with enhanced preferences and restrictions
        const ollamaResponse = await ollamaService.generateMealPlan(
          householdId, 
          days, 
          enhancedPreferences, 
          enhancedRestrictions,
          availableIngredients,
          excludedIngredients
        );
        
        logger.info(`Generated meal plan using Ollama for household ${householdId}`);
        
        // Create meal plan from Ollama response
        const mealPlanName = `AI Generated Meal Plan`;
        const startDate = new Date();
        const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        
        const mealPlan = await MealPlan.create({
          householdId,
          name: mealPlanName,
          startDate,
          endDate,
          status: 'draft',
          tenantId
        });
        
        // Store constraints with the meal plan
        await MealPlan.updateConstraints(mealPlan.id, {
          preferences: enhancedPreferences,
          dietaryRestrictions: enhancedRestrictions,
          availableIngredients,
          excludedIngredients
        }, tenantId);
        
        // Add meal plan items from the Ollama response
        if (ollamaResponse.meals && Array.isArray(ollamaResponse.meals)) {
          for (const meal of ollamaResponse.meals) {
            try {
              await MealPlan.addItem({
                mealPlanId: mealPlan.id,
                recipeId: meal.recipeId,
                plannedDate: new Date(meal.date),
                mealType: meal.type,
                servings: meal.servings || 4,
                notes: meal.notes || '',
                tenantId
              });
            } catch (itemError) {
              logger.warn(`Failed to add meal plan item: ${itemError.message}`);
            }
          }
        }
        
        return await MealPlan.getById(mealPlan.id, tenantId);
      } catch (ollamaError) {
        logger.error(`Ollama service error: ${ollamaError.message}`);
        
        // Fallback to basic meal plan generation
        logger.info(`Falling back to basic meal plan generation for household ${householdId}`);
        return await MealPlan.generate({
          householdId,
          days,
          preferences: enhancedPreferences,
          dietaryRestrictions: enhancedRestrictions,
          availableIngredients,
          excludedIngredients,
          tenantId
        });
      }
    } catch (error) {
      logger.error('Error generating meal plan:', error);
      throw error;
    }
  }
  
  /**
   * Get household members
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Household members
   * @private
   */
  static async _getHouseholdMembers(householdId, tenantId) {
    try {
      // This would normally use the Member model
      // For now, use a placeholder implementation
      return [
        { id: 'member1', name: 'John Doe' },
        { id: 'member2', name: 'Jane Doe' }
      ];
    } catch (error) {
      logger.error(`Error getting members for household ${householdId}:`, error);
      throw error;
    }
  }
  
  /**
   * Combine explicit preferences with learned preferences
   * @param {Array} explicitPreferences - Explicit preferences
   * @param {Object} memberPreferences - Member preferences
   * @returns {Array} Combined preferences
   * @private
   */
  static _combinePreferences(explicitPreferences, memberPreferences) {
    // Start with explicit preferences
    const combined = [...(explicitPreferences || [])];
    
    // Add learned preferences from all members
    for (const memberId in memberPreferences) {
      const preferences = memberPreferences[memberId];
      
      // Extract likes and dislikes
      const likes = preferences
        .filter(p => p.preference_level > 1) // Only strong preferences (2-3)
        .map(p => `likes:${p.ingredient_name}`);
      
      const dislikes = preferences
        .filter(p => p.preference_level < -1) // Only strong preferences (-2 to -3)
        .map(p => `dislikes:${p.ingredient_name}`);
      
      // Add to combined preferences
      combined.push(...likes, ...dislikes);
    }
    
    return combined;
  }

  /**
   * Get meal plan constraints
   * @param {string} id - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Meal plan constraints
   */
  static async getMealPlanConstraints(id, tenantId) {
    try {
      // Check if meal plan exists
      const mealPlan = await MealPlan.getById(id, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${id}`);
      }
      
      // Get constraints
      const constraints = await MealPlan.getConstraints(id, tenantId);
      return constraints;
    } catch (error) {
      logger.error(`Error getting meal plan constraints ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update meal plan constraints
   * @param {string} id - Meal plan ID
   * @param {Object} data - Constraint data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated constraints
   */
  static async updateMealPlanConstraints(id, data, tenantId) {
    try {
      // Check if meal plan exists
      const mealPlan = await MealPlan.getById(id, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${id}`);
      }
      
      // Update constraints
      const constraints = await MealPlan.updateConstraints(id, data, tenantId);
      
      logger.info(`Updated constraints for meal plan ${id}`);
      return constraints;
    } catch (error) {
      logger.error(`Error updating meal plan constraints ${id}:`, error);
      throw error;
    }
  }

  /**
   * Regenerate a meal plan with adjusted constraints
   * @param {string} id - Meal plan ID
   * @param {Object} data - Constraint data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Regenerated meal plan
   */
  static async regenerateMealPlan(id, data, tenantId) {
    try {
      // Check if meal plan exists
      const mealPlan = await MealPlan.getById(id, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${id}`);
      }
      
      // Update constraints
      await MealPlan.updateConstraints(id, data, tenantId);
      
      // Get full constraints
      const constraints = await MealPlan.getConstraints(id, tenantId);
      
      // Calculate number of days
      const startDate = new Date(mealPlan.start_date);
      const endDate = new Date(mealPlan.end_date);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      // Generate a new meal plan with updated constraints
      const generatedPlan = await this.generateMealPlan({
        householdId: mealPlan.household_id,
        days,
        preferences: constraints.preferences,
        dietaryRestrictions: constraints.dietaryRestrictions,
        availableIngredients: constraints.availableIngredients,
        excludedIngredients: constraints.excludedIngredients
      }, tenantId);
      
      // Copy items from generated plan to this plan
      if (generatedPlan && generatedPlan.items) {
        // First, remove all existing items
        const itemsQuery = `
          DELETE FROM meal_plan_items
          WHERE meal_plan_id = $1 AND tenant_id = $2
        `;
        
        await pool.query(itemsQuery, [id, tenantId]);
        
        // Add new items
        for (const item of generatedPlan.items) {
          await MealPlan.addItem({
            mealPlanId: id,
            recipeId: item.recipeId,
            plannedDate: item.plannedDate,
            mealType: item.mealType,
            servings: item.servings,
            notes: item.notes,
            tenantId
          });
        }
        
        // Delete the temporary generated plan
        await MealPlan.delete(generatedPlan.id, tenantId);
      }
      
      logger.info(`Regenerated meal plan ${id}`);
      return await MealPlan.getById(id, tenantId);
    } catch (error) {
      logger.error(`Error regenerating meal plan ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get member dietary profile
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Dietary profile
   * @private
   */
  static async _getMemberDietaryProfile(memberId, tenantId) {
    // Try to import dietaryPreference service
    try {
      const dietaryPreferenceService = require('./dietaryPreference.service');
      return await dietaryPreferenceService.getMemberDietaryProfile(memberId, tenantId);
    } catch (error) {
      logger.warn(`Unable to get dietary profile for member ${memberId}: ${error.message}`);
      return {
        allergies: [],
        diets: [],
        restrictions: []
      };
    }
  }

  /**
   * Combine dietary restrictions
   * @param {Array} explicitRestrictions - Explicit restrictions
   * @param {Object} memberRestrictions - Member restrictions by member ID
   * @returns {Array} Combined restrictions
   * @private
   */
  static _combineDietaryRestrictions(explicitRestrictions, memberRestrictions) {
    // Start with explicit restrictions
    const combinedRestrictions = [...explicitRestrictions];
    
    // Add member restrictions
    for (const memberId in memberRestrictions) {
      const member = memberRestrictions[memberId];
      
      // Add allergies
      if (member.allergies && Array.isArray(member.allergies)) {
        for (const allergy of member.allergies) {
          const allergyItem = {
            type: 'allergy',
            value: allergy.item || allergy.name || allergy,
            severity: allergy.severity || 'high',
            memberId
          };
          
          // Only add if not already in combined restrictions
          if (!combinedRestrictions.some(r => 
              r.type === allergyItem.type && 
              r.value.toLowerCase() === allergyItem.value.toLowerCase())) {
            combinedRestrictions.push(allergyItem);
          }
        }
      }
      
      // Add diets
      if (member.diets && Array.isArray(member.diets)) {
        for (const diet of member.diets) {
          const dietItem = {
            type: 'diet',
            value: diet.name || diet,
            memberId
          };
          
          // Only add if not already in combined restrictions
          if (!combinedRestrictions.some(r => 
              r.type === dietItem.type && 
              r.value.toLowerCase() === dietItem.value.toLowerCase())) {
            combinedRestrictions.push(dietItem);
          }
        }
      }
      
      // Add restrictions
      if (member.restrictions && Array.isArray(member.restrictions)) {
        for (const restriction of member.restrictions) {
          const restrictionItem = {
            type: 'restriction',
            value: restriction.item || restriction.name || restriction,
            reason: restriction.reason || 'preference',
            memberId
          };
          
          // Only add if not already in combined restrictions
          if (!combinedRestrictions.some(r => 
              r.type === restrictionItem.type && 
              r.value.toLowerCase() === restrictionItem.value.toLowerCase())) {
            combinedRestrictions.push(restrictionItem);
          }
        }
      }
    }
    
    return combinedRestrictions;
  }
}

module.exports = MealPlanService;
