const { FoodPreference } = require('../models');
const logger = require('../utils/logger');
const ollamaService = require('./ollama.service');
const { redisClient } = require('./redis');
const PreferenceLearningService = require('./preferenceLearning.service');

/**
 * PreferenceAdjustment service
 * Handles viewing and adjusting user preferences that have been learned by the system
 */
class PreferenceAdjustmentService {
  /**
   * Get all preferences for a member
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Member preferences
   */
  static async getMemberPreferences(memberId, tenantId) {
    try {
      // Get preferences from database
      const preferences = await FoodPreference.getByMemberId(memberId, tenantId);
      
      // Get preference categories to organize the preferences
      const categories = await this.getPreferenceCategories();
      
      // Organize preferences by category
      const organizedPreferences = this._organizePreferencesByCategory(preferences, categories);
      
      logger.info(`Retrieved ${preferences.length} preferences for member ${memberId}`);
      
      return organizedPreferences;
    } catch (error) {
      logger.error(`Error getting preferences for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Get preference categories for organizing the preference UI
   * @returns {Promise<Array>} Preference categories
   */
  static async getPreferenceCategories() {
    try {
      // Check cache first
      const cacheKey = 'preference-categories';
      const cachedCategories = await redisClient.get(cacheKey);
      if (cachedCategories) {
        logger.debug('Returning cached preference categories');
        return JSON.parse(cachedCategories);
      }
      
      // Define standard food categories
      const categories = [
        {
          id: 'vegetables',
          name: 'Vegetables',
          description: 'Plant-based foods typically used as side dishes or in salads',
          examples: ['broccoli', 'carrots', 'spinach', 'tomatoes']
        },
        {
          id: 'fruits',
          name: 'Fruits',
          description: 'Sweet plant foods typically eaten raw or in desserts',
          examples: ['apples', 'bananas', 'berries', 'citrus']
        },
        {
          id: 'proteins',
          name: 'Proteins',
          description: 'Meat, fish, and plant-based protein sources',
          examples: ['chicken', 'beef', 'tofu', 'beans']
        },
        {
          id: 'grains',
          name: 'Grains',
          description: 'Wheat, rice, and other cereal grains',
          examples: ['rice', 'pasta', 'bread', 'quinoa']
        },
        {
          id: 'dairy',
          name: 'Dairy',
          description: 'Milk-based products',
          examples: ['milk', 'cheese', 'yogurt', 'butter']
        },
        {
          id: 'spices',
          name: 'Herbs & Spices',
          description: 'Flavorings and seasonings',
          examples: ['basil', 'cumin', 'garlic', 'cinnamon']
        },
        {
          id: 'nuts',
          name: 'Nuts & Seeds',
          description: 'Tree nuts, peanuts, and seeds',
          examples: ['almonds', 'walnuts', 'sunflower seeds', 'chia seeds']
        },
        {
          id: 'condiments',
          name: 'Condiments & Sauces',
          description: 'Flavor enhancers added to dishes',
          examples: ['ketchup', 'soy sauce', 'mayonnaise', 'hot sauce']
        },
        {
          id: 'sweets',
          name: 'Sweets & Desserts',
          description: 'Sweet foods typically eaten after meals',
          examples: ['chocolate', 'ice cream', 'cookies', 'cake']
        },
        {
          id: 'beverages',
          name: 'Beverages',
          description: 'Drinks and drink ingredients',
          examples: ['coffee', 'tea', 'juice', 'soda']
        },
        {
          id: 'other',
          name: 'Other',
          description: 'Ingredients that don\'t fit in other categories',
          examples: []
        }
      ];
      
      // Cache categories for 24 hours
      await redisClient.set(cacheKey, JSON.stringify(categories), { EX: 86400 });
      
      return categories;
    } catch (error) {
      logger.error('Error getting preference categories:', error);
      throw error;
    }
  }

  /**
   * Update a specific preference for a member
   * @param {string} memberId - Member ID
   * @param {string} preferenceId - Preference ID
   * @param {number} score - New preference score (-3 to +3)
   * @param {string} notes - Optional notes about the preference
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated preference
   */
  static async updatePreference(memberId, preferenceId, score, notes, tenantId) {
    try {
      // Validate score is within range
      if (score < -3 || score > 3) {
        throw new Error('Preference score must be between -3 and +3');
      }
      
      // Get the current preference
      const preference = await FoodPreference.getById(preferenceId, tenantId);
      
      // Verify the preference belongs to the member
      if (!preference || preference.member_id !== memberId) {
        throw new Error('Preference not found or does not belong to the member');
      }
      
      // Update the preference
      const updatedPreference = await FoodPreference.update(
        preferenceId,
        { preferenceLevel: score, notes },
        tenantId
      );
      
      // Invalidate cache
      await this._invalidatePreferenceCache(memberId, tenantId);
      
      logger.info(`Updated preference ${preferenceId} for member ${memberId}`);
      
      return updatedPreference;
    } catch (error) {
      logger.error(`Error updating preference ${preferenceId} for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Add a new preference for a member
   * @param {string} memberId - Member ID
   * @param {string} tagId - Tag or ingredient ID
   * @param {number} score - Preference score (-3 to +3)
   * @param {string} notes - Optional notes about the preference
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} New preference
   */
  static async addPreference(memberId, tagId, score, notes, tenantId) {
    try {
      // Validate score is within range
      if (score < -3 || score > 3) {
        throw new Error('Preference score must be between -3 and +3');
      }
      
      // Check if preference already exists
      const existingPreference = await FoodPreference.getByMemberAndIngredient(
        memberId,
        tagId,
        tenantId
      );
      
      if (existingPreference) {
        // Update existing preference
        return await this.updatePreference(
          memberId,
          existingPreference.id,
          score,
          notes,
          tenantId
        );
      }
      
      // Create new preference
      const newPreference = await FoodPreference.create({
        memberId,
        ingredientId: tagId,
        preferenceLevel: score,
        notes,
        tenantId
      });
      
      // Invalidate cache
      await this._invalidatePreferenceCache(memberId, tenantId);
      
      logger.info(`Added new preference for member ${memberId} and ingredient ${tagId}`);
      
      return newPreference;
    } catch (error) {
      logger.error(`Error adding preference for member ${memberId} and ingredient ${tagId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a preference for a member
   * @param {string} memberId - Member ID
   * @param {string} preferenceId - Preference ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deletePreference(memberId, preferenceId, tenantId) {
    try {
      // Get the current preference
      const preference = await FoodPreference.getById(preferenceId, tenantId);
      
      // Verify the preference belongs to the member
      if (!preference || preference.member_id !== memberId) {
        throw new Error('Preference not found or does not belong to the member');
      }
      
      // Delete the preference
      const success = await FoodPreference.delete(preferenceId, tenantId);
      
      // Invalidate cache
      await this._invalidatePreferenceCache(memberId, tenantId);
      
      logger.info(`Deleted preference ${preferenceId} for member ${memberId}`);
      
      return success;
    } catch (error) {
      logger.error(`Error deleting preference ${preferenceId} for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Reset all preferences for a member to system-learned defaults
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async resetPreferences(memberId, tenantId) {
    try {
      // This would normally delete all manually adjusted preferences
      // and revert to the system-learned preferences
      
      // For now, just delete all preferences and let the system learn new ones
      const query = `
        DELETE FROM food_preferences
        WHERE member_id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [memberId, tenantId];
      
      // In a real implementation, this would use the database pool
      // For now, just log the operation
      logger.info(`Reset preferences for member ${memberId}`);
      
      // Invalidate cache
      await this._invalidatePreferenceCache(memberId, tenantId);
      
      return true;
    } catch (error) {
      logger.error(`Error resetting preferences for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Generate preference insights for a member
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Preference insights
   */
  static async generatePreferenceInsights(memberId, tenantId) {
    try {
      // Get member preferences
      const preferences = await FoodPreference.getByMemberId(memberId, tenantId);
      
      // Get member dietary restrictions
      const dietaryRestrictions = await this._getMemberDietaryRestrictions(memberId, tenantId);
      
      // Get member meal history
      const mealHistory = await this._getMemberMealHistory(memberId, tenantId);
      
      // Generate insights using AI
      const insights = await this._generateInsightsWithAI(
        memberId,
        preferences,
        dietaryRestrictions,
        mealHistory,
        tenantId
      );
      
      logger.info(`Generated preference insights for member ${memberId}`);
      
      return insights;
    } catch (error) {
      logger.error(`Error generating preference insights for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Get preference conflicts between household members
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Preference conflicts
   */
  static async getHouseholdPreferenceConflicts(householdId, tenantId) {
    try {
      // Get household members
      const members = await this._getHouseholdMembers(householdId, tenantId);
      
      // Get preferences for all members
      const memberPreferences = {};
      for (const member of members) {
        memberPreferences[member.id] = await FoodPreference.getByMemberId(member.id, tenantId);
      }
      
      // Find conflicts
      const conflicts = this._findPreferenceConflicts(members, memberPreferences);
      
      logger.info(`Found ${conflicts.length} preference conflicts for household ${householdId}`);
      
      return conflicts;
    } catch (error) {
      logger.error(`Error getting preference conflicts for household ${householdId}:`, error);
      throw error;
    }
  }

  /**
   * Organize preferences by category
   * @param {Array} preferences - Member preferences
   * @param {Array} categories - Preference categories
   * @returns {Object} Organized preferences
   * @private
   */
  static _organizePreferencesByCategory(preferences, categories) {
    // Initialize result with categories
    const result = {};
    for (const category of categories) {
      result[category.id] = {
        category: category,
        preferences: []
      };
    }
    
    // Add "uncategorized" category
    result.uncategorized = {
      category: {
        id: 'uncategorized',
        name: 'Uncategorized',
        description: 'Ingredients that haven\'t been categorized yet'
      },
      preferences: []
    };
    
    // Assign preferences to categories
    for (const preference of preferences) {
      // In a real implementation, this would use the ingredient's category
      // For now, use a simple mapping based on ingredient name
      const ingredientName = preference.ingredient_name?.toLowerCase() || '';
      let assigned = false;
      
      // Simple categorization logic
      if (/carrot|broccoli|spinach|lettuce|tomato|potato|onion|garlic|pepper|cucumber/i.test(ingredientName)) {
        result.vegetables.preferences.push(preference);
        assigned = true;
      } else if (/apple|banana|orange|berry|grape|melon|peach|pear|pineapple|mango/i.test(ingredientName)) {
        result.fruits.preferences.push(preference);
        assigned = true;
      } else if (/chicken|beef|pork|fish|tofu|bean|lentil|egg|turkey|lamb/i.test(ingredientName)) {
        result.proteins.preferences.push(preference);
        assigned = true;
      } else if (/rice|pasta|bread|wheat|oat|barley|quinoa|corn|flour|cereal/i.test(ingredientName)) {
        result.grains.preferences.push(preference);
        assigned = true;
      } else if (/milk|cheese|yogurt|cream|butter|ice cream/i.test(ingredientName)) {
        result.dairy.preferences.push(preference);
        assigned = true;
      } else if (/salt|pepper|basil|oregano|thyme|cinnamon|cumin|paprika|curry|ginger/i.test(ingredientName)) {
        result.spices.preferences.push(preference);
        assigned = true;
      } else if (/almond|walnut|peanut|cashew|pecan|seed|chia|flax|sesame|sunflower/i.test(ingredientName)) {
        result.nuts.preferences.push(preference);
        assigned = true;
      } else if (/ketchup|mustard|mayo|sauce|dressing|oil|vinegar|syrup|honey|jam/i.test(ingredientName)) {
        result.condiments.preferences.push(preference);
        assigned = true;
      } else if (/chocolate|cookie|cake|pie|candy|sugar|dessert|sweet|ice cream/i.test(ingredientName)) {
        result.sweets.preferences.push(preference);
        assigned = true;
      } else if (/coffee|tea|juice|soda|water|wine|beer|cocktail|smoothie|milk/i.test(ingredientName)) {
        result.beverages.preferences.push(preference);
        assigned = true;
      }
      
      // If not assigned to a specific category
      if (!assigned) {
        result.other.preferences.push(preference);
      }
    }
    
    return result;
  }

  /**
   * Invalidate preference cache
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<void>}
   * @private
   */
  static async _invalidatePreferenceCache(memberId, tenantId) {
    try {
      // Delete all cache keys related to this member's preferences
      const pattern = `preferences:${memberId}:*`;
      const recommendationsPattern = `recommendations:${memberId}:*`;
      
      // In a real implementation, this would use Redis SCAN and DEL commands
      // For now, just log the operation
      logger.debug(`Invalidated cache for patterns: ${pattern}, ${recommendationsPattern}`);
    } catch (error) {
      logger.error(`Error invalidating preference cache for member ${memberId}:`, error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Get member dietary restrictions
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Dietary restrictions
   * @private
   */
  static async _getMemberDietaryRestrictions(memberId, tenantId) {
    try {
      // This would normally use the MemberDiet model
      // For now, use a placeholder implementation
      return {
        dietTypes: ['vegetarian'],
        allergies: ['peanuts']
      };
    } catch (error) {
      logger.error(`Error getting dietary restrictions for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Get member meal history
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Meal history
   * @private
   */
  static async _getMemberMealHistory(memberId, tenantId) {
    try {
      // This would normally use the MealHistory model
      // For now, use a placeholder implementation
      return [];
    } catch (error) {
      logger.error(`Error getting meal history for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Generate insights with AI
   * @param {string} memberId - Member ID
   * @param {Array} preferences - Member preferences
   * @param {Object} dietaryRestrictions - Dietary restrictions
   * @param {Array} mealHistory - Meal history
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Preference insights
   * @private
   */
  static async _generateInsightsWithAI(memberId, preferences, dietaryRestrictions, mealHistory, tenantId) {
    try {
      // Format preferences for the AI prompt
      const formattedPreferences = this._formatPreferencesForPrompt(preferences);
      
      // Format dietary restrictions for the AI prompt
      const formattedRestrictions = this._formatRestrictionsForPrompt(dietaryRestrictions);
      
      // Format meal history for the AI prompt
      const formattedHistory = this._formatMealHistoryForPrompt(mealHistory);
      
      // Construct prompt for AI analysis
      const prompt = `
        Analyze the following user's food preferences, dietary restrictions, and meal history:
        
        ${formattedPreferences}
        
        ${formattedRestrictions}
        
        ${formattedHistory}
        
        Based on this information, provide:
        1. A summary of the user's food preferences and patterns
        2. Ingredient categories they seem to enjoy
        3. Ingredient categories they seem to dislike
        4. Cuisine types that might appeal to them
        5. Suggestions for new ingredients or dishes they might enjoy
        6. Potential nutritional gaps based on their preferences
        7. Recommendations for balancing their diet while respecting preferences
        
        Format your response as a JSON object with these sections.
      `;
      
      // In a real implementation, this would call the Ollama service
      // For now, return placeholder insights
      return {
        summary: "The user has a preference for vegetarian dishes with a variety of vegetables. They particularly enjoy Asian and Mediterranean flavors.",
        likedCategories: ["vegetables", "legumes", "grains"],
        dislikedCategories: ["meat", "seafood"],
        recommendedCuisines: ["Thai", "Greek", "Indian", "Mexican"],
        suggestions: [
          "Try adding more tofu dishes for protein variety",
          "Explore Indian curries with chickpeas and lentils",
          "Consider Mediterranean grain bowls with falafel"
        ],
        nutritionalGaps: [
          "May be low in vitamin B12 due to vegetarian diet",
          "Could benefit from more iron-rich plant foods",
          "Omega-3 fatty acids might be lacking without seafood"
        ],
        balancingRecommendations: [
          "Include fortified plant milks for vitamin B12",
          "Combine iron-rich foods with vitamin C for better absorption",
          "Add flaxseeds and walnuts for plant-based omega-3s"
        ]
      };
    } catch (error) {
      logger.error(`Error generating insights with AI for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Format preferences for AI prompt
   * @param {Array} preferences - Member preferences
   * @returns {string} Formatted preferences
   * @private
   */
  static _formatPreferencesForPrompt(preferences) {
    // Group preferences by level
    const liked = preferences.filter(p => p.preference_level > 0)
      .map(p => p.ingredient_name || 'Unknown');
    
    const disliked = preferences.filter(p => p.preference_level < 0)
      .map(p => p.ingredient_name || 'Unknown');
    
    // Format as text
    let result = 'Preferences:\n';
    
    if (liked.length > 0) {
      result += `- Likes: ${liked.join(', ')}\n`;
    } else {
      result += '- No specific likes recorded\n';
    }
    
    if (disliked.length > 0) {
      result += `- Dislikes: ${disliked.join(', ')}\n`;
    } else {
      result += '- No specific dislikes recorded\n';
    }
    
    return result;
  }

  /**
   * Format restrictions for AI prompt
   * @param {Object} restrictions - Dietary restrictions
   * @returns {string} Formatted restrictions
   * @private
   */
  static _formatRestrictionsForPrompt(restrictions) {
    const { dietTypes = [], allergies = [] } = restrictions;
    
    // Format as text
    let result = 'Dietary Restrictions:\n';
    
    if (dietTypes.length > 0) {
      result += `- Diet Types: ${dietTypes.join(', ')}\n`;
    } else {
      result += '- No specific diet types\n';
    }
    
    if (allergies.length > 0) {
      result += `- Allergies: ${allergies.join(', ')}\n`;
    } else {
      result += '- No known allergies\n';
    }
    
    return result;
  }

  /**
   * Format meal history for AI prompt
   * @param {Array} mealHistory - Meal history
   * @returns {string} Formatted meal history
   * @private
   */
  static _formatMealHistoryForPrompt(mealHistory) {
    if (!mealHistory || mealHistory.length === 0) {
      return 'Meal History:\n- No meal history available';
    }
    
    // Format as text
    let result = 'Meal History (recent meals and ratings):\n';
    
    // In a real implementation, this would format the actual meal history
    // For now, return placeholder text
    result += '- No detailed meal history available';
    
    return result;
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
   * Find preference conflicts between household members
   * @param {Array} members - Household members
   * @param {Object} memberPreferences - Member preferences
   * @returns {Array} Preference conflicts
   * @private
   */
  static _findPreferenceConflicts(members, memberPreferences) {
    const conflicts = [];
    
    // Create a map of ingredient to members who like/dislike it
    const ingredientMap = {};
    
    // Populate the map
    for (const member of members) {
      const preferences = memberPreferences[member.id] || [];
      
      for (const pref of preferences) {
        const ingredientId = pref.ingredient_id;
        const ingredientName = pref.ingredient_name || 'Unknown';
        
        if (!ingredientMap[ingredientId]) {
          ingredientMap[ingredientId] = {
            id: ingredientId,
            name: ingredientName,
            likes: [],
            dislikes: []
          };
        }
        
        if (pref.preference_level > 0) {
          ingredientMap[ingredientId].likes.push({
            memberId: member.id,
            memberName: member.name,
            score: pref.preference_level
          });
        } else if (pref.preference_level < 0) {
          ingredientMap[ingredientId].dislikes.push({
            memberId: member.id,
            memberName: member.name,
            score: pref.preference_level
          });
        }
      }
    }
    
    // Find ingredients with both likes and dislikes
    for (const ingredientId in ingredientMap) {
      const ingredient = ingredientMap[ingredientId];
      
      if (ingredient.likes.length > 0 && ingredient.dislikes.length > 0) {
        conflicts.push({
          ingredient: {
            id: ingredient.id,
            name: ingredient.name
          },
          likes: ingredient.likes,
          dislikes: ingredient.dislikes,
          severity: this._calculateConflictSeverity(ingredient.likes, ingredient.dislikes)
        });
      }
    }
    
    // Sort conflicts by severity (highest first)
    conflicts.sort((a, b) => b.severity - a.severity);
    
    return conflicts;
  }

  /**
   * Calculate conflict severity
   * @param {Array} likes - Members who like the ingredient
   * @param {Array} dislikes - Members who dislike the ingredient
   * @returns {number} Conflict severity (0-100)
   * @private
   */
  static _calculateConflictSeverity(likes, dislikes) {
    // Calculate average like and dislike scores
    const avgLike = likes.reduce((sum, like) => sum + like.score, 0) / likes.length;
    const avgDislike = Math.abs(dislikes.reduce((sum, dislike) => sum + dislike.score, 0) / dislikes.length);
    
    // Calculate severity based on number of people and strength of preferences
    const peopleCount = likes.length + dislikes.length;
    const preferenceStrength = avgLike + avgDislike;
    
    // Normalize to 0-100 scale
    // More people and stronger preferences = higher severity
    return Math.min(100, Math.round((peopleCount * 10 + preferenceStrength * 15) / 2));
  }
}

module.exports = PreferenceAdjustmentService;
