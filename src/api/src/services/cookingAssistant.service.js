const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { redisClient } = require('./redis');
const ollamaService = require('./ollama.service');
const RecipeRatingService = require('./recipeRating.service');
const PreferenceLearningService = require('./preferenceLearning.service');
const { Recipe, CookingSession } = require('../models');
const { pool } = require('../db');

/**
 * CookingAssistant service
 * Provides interactive guidance during the cooking process
 */
class CookingAssistantService {
  /**
   * Start a cooking session
   * @param {Object} data - Session data
   * @param {string} data.memberId - Member ID
   * @param {string} data.recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Cooking session
   */
  static async startSession(data, tenantId) {
    try {
      const { memberId, recipeId } = data;
      
      // Get recipe details
      const recipe = await this._getRecipeDetails(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Get member preferences from cache or database
      const preferences = await this._getMemberPreferences(memberId, tenantId);
      
      // Get member dietary restrictions from cache or database
      const dietaryRestrictions = await this._getMemberDietaryRestrictions(memberId, tenantId);
      
      // Get household id for the member
      const household = await this._getMemberHousehold(memberId, tenantId);
      if (!household) {
        throw new Error(`Household not found for member: ${memberId}`);
      }
      
      // Generate session ID
      const sessionId = `cooking-${memberId}-${recipeId}-${Date.now()}`;
      const redisKey = `cooking-session:${sessionId}`;
      
      // Create session in Redis
      const session = {
        id: sessionId,
        memberId,
        recipeId,
        recipe,
        preferences,
        dietaryRestrictions,
        startTime: new Date().toISOString(),
        messages: [
          {
            role: 'system',
            content: this._constructSystemPrompt(recipe, preferences, dietaryRestrictions)
          },
          {
            role: 'assistant',
            content: `I'm your cooking assistant for ${recipe.title}. I'll help guide you through the recipe and answer any questions you have. Would you like to start cooking now?`
          }
        ],
        currentStep: 0,
        status: 'active'
      };
      
      // Store session in Redis (expires after 24 hours)
      await redisClient.set(redisKey, JSON.stringify(session), { EX: 86400 });
      
      // Also store in database for persistence
      await CookingSession.create({
        recipeId,
        memberId,
        householdId: household.id,
        redisKey,
        messages: session.messages,
        tenantId
      });
      
      logger.info(`Started cooking session ${sessionId} for member ${memberId} and recipe ${recipeId}`);
      
      return {
        sessionId,
        recipe: {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions
        },
        message: session.messages[session.messages.length - 1].content
      };
    } catch (error) {
      logger.error('Error starting cooking session:', error);
      throw error;
    }
  }
  
  /**
   * Send a message to the cooking assistant
   * @param {string} sessionId - Session ID
   * @param {string} message - User message
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Assistant response
   */
  static async sendMessage(sessionId, message, tenantId) {
    try {
      // Get session from Redis
      const sessionData = await redisClient.get(`cooking-session:${sessionId}`);
      if (!sessionData) {
        throw new Error(`Cooking session not found: ${sessionId}`);
      }
      
      const session = JSON.parse(sessionData);
      
      // Add user message to session
      session.messages.push({
        role: 'user',
        content: message
      });
      
      // Generate assistant response
      const response = await this._generateAssistantResponse(session, message, tenantId);
      
      // Add assistant response to session
      session.messages.push({
        role: 'assistant',
        content: response
      });
      
      // Update session in Redis
      await redisClient.set(`cooking-session:${sessionId}`, JSON.stringify(session), { EX: 86400 });
      
      logger.info(`Processed message in cooking session ${sessionId}`);
      
      return {
        sessionId,
        message: response
      };
    } catch (error) {
      logger.error(`Error processing message in cooking session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get next step in the recipe
   * @param {string} sessionId - Session ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Next step
   */
  static async getNextStep(sessionId, tenantId) {
    try {
      // Get session from Redis
      const sessionData = await redisClient.get(`cooking-session:${sessionId}`);
      if (!sessionData) {
        throw new Error(`Cooking session not found: ${sessionId}`);
      }
      
      const session = JSON.parse(sessionData);
      
      // Get recipe
      const recipe = session.recipe;
      
      // Increment current step
      session.currentStep += 1;
      
      // Check if we've reached the end of the recipe
      if (session.currentStep >= recipe.instructions.length) {
        // We've completed all steps
        const response = "Congratulations! You've completed all the steps in the recipe. The dish should be ready now. Enjoy your meal!";
        
        // Add assistant message to session
        session.messages.push({
          role: 'assistant',
          content: response
        });
        
        // Update session status
        session.status = 'completed';
        
        // Update session in Redis
        await redisClient.set(`cooking-session:${sessionId}`, JSON.stringify(session), { EX: 86400 });
        
        return {
          sessionId,
          completed: true,
          message: response
        };
      }
      
      // Get the next step
      const nextStep = recipe.instructions[session.currentStep];
      
      // Generate assistant response for this step
      const response = `Step ${session.currentStep + 1}: ${nextStep}`;
      
      // Add assistant message to session
      session.messages.push({
        role: 'assistant',
        content: response
      });
      
      // Update session in Redis
      await redisClient.set(`cooking-session:${sessionId}`, JSON.stringify(session), { EX: 86400 });
      
      logger.info(`Advanced to step ${session.currentStep} in cooking session ${sessionId}`);
      
      return {
        sessionId,
        currentStep: session.currentStep,
        totalSteps: recipe.instructions.length,
        message: response
      };
    } catch (error) {
      logger.error(`Error getting next step in cooking session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get previous step in the recipe
   * @param {string} sessionId - Session ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Previous step
   */
  static async getPreviousStep(sessionId, tenantId) {
    try {
      // Get session from Redis
      const sessionData = await redisClient.get(`cooking-session:${sessionId}`);
      if (!sessionData) {
        throw new Error(`Cooking session not found: ${sessionId}`);
      }
      
      const session = JSON.parse(sessionData);
      
      // Get recipe
      const recipe = session.recipe;
      
      // Decrement current step
      session.currentStep = Math.max(0, session.currentStep - 1);
      
      // Get the previous step
      const prevStep = recipe.instructions[session.currentStep];
      
      // Generate assistant response for this step
      const response = `Step ${session.currentStep + 1}: ${prevStep}`;
      
      // Add assistant message to session
      session.messages.push({
        role: 'assistant',
        content: response
      });
      
      // Update session in Redis
      await redisClient.set(`cooking-session:${sessionId}`, JSON.stringify(session), { EX: 86400 });
      
      logger.info(`Went back to step ${session.currentStep} in cooking session ${sessionId}`);
      
      return {
        sessionId,
        currentStep: session.currentStep,
        totalSteps: recipe.instructions.length,
        message: response
      };
    } catch (error) {
      logger.error(`Error getting previous step in cooking session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get ingredient substitutions
   * @param {string} sessionId - Session ID
   * @param {string} ingredient - Ingredient to substitute
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Substitution suggestions
   */
  static async getIngredientSubstitutions(sessionId, ingredient, tenantId) {
    try {
      // Get session from Redis
      const sessionData = await redisClient.get(`cooking-session:${sessionId}`);
      if (!sessionData) {
        throw new Error(`Cooking session not found: ${sessionId}`);
      }
      
      const session = JSON.parse(sessionData);
      
      // Get member preferences and dietary restrictions
      const { preferences, dietaryRestrictions } = session;
      
      // Construct prompt for substitution
      const prompt = this._constructSubstitutionPrompt(ingredient, preferences, dietaryRestrictions);
      
      // Call Ollama service
      const response = await ollamaService.analyzeDietaryPreferences(prompt);
      
      // Parse the response
      let substitutions = [];
      try {
        if (typeof response === 'string') {
          // Extract JSON from string if needed
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          substitutions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } else if (response.substitutions) {
          substitutions = response.substitutions;
        } else if (response.preferences) {
          substitutions = response.preferences;
        } else {
          substitutions = [];
        }
      } catch (parseError) {
        logger.error('Error parsing substitution response:', parseError);
        substitutions = [];
      }
      
      // Format the response
      const formattedResponse = `Here are some substitutions for ${ingredient}:\n\n` +
        substitutions.map(sub => `- ${sub.name || sub.value}: ${sub.description || 'A good alternative'}`).join('\n');
      
      // Add assistant message to session
      session.messages.push({
        role: 'assistant',
        content: formattedResponse
      });
      
      // Update session in Redis
      await redisClient.set(`cooking-session:${sessionId}`, JSON.stringify(session), { EX: 86400 });
      
      logger.info(`Provided substitutions for ${ingredient} in cooking session ${sessionId}`);
      
      return {
        sessionId,
        ingredient,
        substitutions,
        message: formattedResponse
      };
    } catch (error) {
      logger.error(`Error getting substitutions for ${ingredient} in cooking session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * End cooking session
   * @param {string} sessionId - Session ID
   * @param {Object} data - End session data
   * @param {number} data.rating - Recipe rating (1-5)
   * @param {string} data.feedback - Recipe feedback
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Session summary
   */
  static async endSession(sessionId, data, tenantId) {
    try {
      // Get session from Redis
      const sessionData = await redisClient.get(`cooking-session:${sessionId}`);
      if (!sessionData) {
        throw new Error(`Cooking session not found: ${sessionId}`);
      }
      
      const session = JSON.parse(sessionData);
      
      // If rating provided, submit it
      if (data.rating) {
        try {
          await RecipeRatingService.submitRating({
            recipeId: session.recipeId,
            memberId: session.memberId,
            rating: data.rating,
            feedback: data.feedback || '',
            source: 'cooking_assistant'
          }, tenantId);
          
          logger.info(`Submitted rating ${data.rating} for recipe ${session.recipeId} from cooking session ${sessionId}`);
        } catch (ratingError) {
          logger.warn(`Failed to submit rating from cooking session ${sessionId}:`, ratingError);
        }
      }
      
      // Update session status to completed
      session.status = 'completed';
      session.endTime = new Date().toISOString();
      
      // Store in Redis for a week (in case we need to reference it)
      await redisClient.set(`cooking-session:${sessionId}`, JSON.stringify(session), { EX: 604800 });
      
      // Update the database record
      await CookingSession.endSession(sessionId, {
        rating: data.rating,
        feedback: { text: data.feedback || '' }
      }, tenantId);
      
      logger.info(`Ended cooking session ${sessionId}`);
      
      // Return session summary
      return {
        sessionId,
        recipe: {
          id: session.recipeId,
          title: session.recipe.title
        },
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status
      };
    } catch (error) {
      logger.error(`Error ending cooking session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get active cooking sessions for a member
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Active cooking sessions
   */
  static async getActiveSessions(memberId, tenantId) {
    try {
      // Get active sessions from database
      const activeSessions = await CookingSession.getActiveSessions(memberId, tenantId);
      
      return activeSessions;
    } catch (error) {
      logger.error(`Error getting active cooking sessions for member ${memberId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get recipe details
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Recipe details
   * @private
   */
  static async _getRecipeDetails(recipeId, tenantId) {
    try {
      // This would normally use the Recipe model
      // For now, use a placeholder implementation
      return {
        id: recipeId,
        title: 'Vegetable Stir Fry with Rice',
        description: 'A quick and flavorful vegetable stir fry served over steamed rice',
        prepTime: 15,
        cookTime: 10,
        servings: 4,
        ingredients: [
          { name: 'broccoli', quantity: 2, unit: 'cups' },
          { name: 'carrots', quantity: 2, unit: 'medium' },
          { name: 'bell peppers', quantity: 1, unit: 'large' },
          { name: 'rice', quantity: 2, unit: 'cups' },
          { name: 'soy sauce', quantity: 3, unit: 'tablespoons' },
          { name: 'garlic', quantity: 3, unit: 'cloves' },
          { name: 'ginger', quantity: 1, unit: 'tablespoon' },
          { name: 'vegetable oil', quantity: 2, unit: 'tablespoons' }
        ],
        instructions: [
          'Wash and chop all vegetables into bite-sized pieces.',
          'Cook rice according to package instructions.',
          'Heat vegetable oil in a large wok or skillet over high heat.',
          'Add garlic and ginger, stir for 30 seconds until fragrant.',
          'Add broccoli and carrots, stir fry for 3 minutes.',
          'Add bell peppers and continue cooking for 2 minutes.',
          'Add soy sauce and stir to coat all vegetables.',
          'Serve vegetables over cooked rice.'
        ],
        tags: ['vegetarian', 'quick', 'asian']
      };
    } catch (error) {
      logger.error(`Error getting recipe ${recipeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Construct system prompt for cooking assistant
   * @param {Object} recipe - Recipe details
   * @param {Array} preferences - Member preferences
   * @param {Object} dietaryRestrictions - Dietary restrictions
   * @returns {string} System prompt
   * @private
   */
  static _constructSystemPrompt(recipe, preferences, dietaryRestrictions) {
    // Format recipe ingredients
    const ingredientsList = recipe.ingredients.map(ing => 
      `- ${ing.quantity} ${ing.unit} ${ing.name}`
    ).join('\n');
    
    // Format recipe instructions
    const instructionsList = recipe.instructions.map((step, index) => 
      `${index + 1}. ${step}`
    ).join('\n');
    
    // Format preferences
    const formattedPreferences = PreferenceLearningService._formatPreferencesForPrompt(preferences);
    
    // Format dietary restrictions
    const formattedRestrictions = PreferenceLearningService._formatRestrictionsForPrompt(dietaryRestrictions);
    
    return `
You are a helpful cooking assistant guiding the user through preparing the recipe "${recipe.title}".

Recipe Details:
- Title: ${recipe.title}
- Description: ${recipe.description}
- Prep Time: ${recipe.prepTime} minutes
- Cook Time: ${recipe.cookTime} minutes
- Servings: ${recipe.servings}

Ingredients:
${ingredientsList}

Instructions:
${instructionsList}

User Preferences:
${formattedPreferences}

Dietary Restrictions:
${formattedRestrictions}

Your role is to:
1. Guide the user through each step of the recipe
2. Answer questions about cooking techniques, timing, and ingredient substitutions
3. Provide helpful tips based on the user's preferences and dietary restrictions
4. Be encouraging and supportive throughout the cooking process
5. Help troubleshoot if the user encounters any issues

Keep your responses concise and focused on helping the user cook this specific recipe.
If the user asks about substituting ingredients, consider their preferences and dietary restrictions.
If the user asks about a cooking technique, explain it clearly and in the context of this recipe.
`;
  }
  
  /**
   * Generate assistant response
   * @param {Object} session - Cooking session
   * @param {string} message - User message
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<string>} Assistant response
   * @private
   */
  static async _generateAssistantResponse(session, message, tenantId) {
    try {
      // Analyze the message to determine intent
      const lowerMessage = message.toLowerCase();
      
      // Check for common intents
      if (lowerMessage.includes('next step') || lowerMessage === 'next') {
        // User wants the next step
        const nextStepResult = await this.getNextStep(session.id, tenantId);
        return nextStepResult.message;
      } else if (lowerMessage.includes('previous step') || lowerMessage === 'back' || lowerMessage === 'previous') {
        // User wants the previous step
        const prevStepResult = await this.getPreviousStep(session.id, tenantId);
        return prevStepResult.message;
      } else if (lowerMessage.includes('substitute') || lowerMessage.includes('replacement for')) {
        // User wants ingredient substitution
        // Extract the ingredient from the message
        let ingredient = '';
        
        if (lowerMessage.includes('substitute for')) {
          ingredient = message.split('substitute for')[1].trim();
        } else if (lowerMessage.includes('replacement for')) {
          ingredient = message.split('replacement for')[1].trim();
        } else if (lowerMessage.includes('instead of')) {
          ingredient = message.split('instead of')[1].trim();
        }
        
        if (ingredient) {
          const substitutionResult = await this.getIngredientSubstitutions(session.id, ingredient, tenantId);
          return substitutionResult.message;
        }
      }
      
      // For other messages, use Ollama to generate a response
      // Prepare the conversation history for the LLM
      const conversationHistory = session.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add the current user message
      conversationHistory.push({
        role: 'user',
        content: message
      });
      
      // Construct prompt for Ollama
      const prompt = `
You are a cooking assistant helping with the recipe "${session.recipe.title}".
The user is currently on step ${session.currentStep + 1} of ${session.recipe.instructions.length}.

Current step: ${session.recipe.instructions[session.currentStep]}

${message}
`;
      
      // Call Ollama service
      const response = await ollamaService.analyzeDietaryPreferences(prompt);
      
      // Extract the response text
      let responseText = '';
      if (typeof response === 'string') {
        responseText = response;
      } else if (response.response) {
        responseText = response.response;
      } else if (response.preferences) {
        // Fallback if we get a preferences object
        responseText = "I'm here to help you with your cooking. What would you like to know?";
      }
      
      return responseText;
    } catch (error) {
      logger.error('Error generating assistant response:', error);
      return "I'm sorry, I'm having trouble processing your request. Please try again.";
    }
  }
  
  /**
   * Construct prompt for ingredient substitution
   * @param {string} ingredient - Ingredient to substitute
   * @param {Array} preferences - Member preferences
   * @param {Object} dietaryRestrictions - Dietary restrictions
   * @returns {string} Substitution prompt
   * @private
   */
  static _constructSubstitutionPrompt(ingredient, preferences, dietaryRestrictions) {
    // Format preferences
    const formattedPreferences = PreferenceLearningService._formatPreferencesForPrompt(preferences);
    
    // Format dietary restrictions
    const formattedRestrictions = PreferenceLearningService._formatRestrictionsForPrompt(dietaryRestrictions);
    
    return `
I need substitution options for ${ingredient} in a recipe.

User Preferences:
${formattedPreferences}

Dietary Restrictions:
${formattedRestrictions}

Please suggest 3-5 substitutions for ${ingredient} that:
1. Would work well in cooking
2. Consider the user's preferences and dietary restrictions
3. Include common ingredients people might have at home

Format your response as a JSON array with these fields for each substitution:
- name: The name of the substitute ingredient
- description: A brief explanation of why it works as a substitute
- conversionRatio: How much to use compared to the original (e.g., "1:1" or "half the amount")
- flavor: How the flavor compares to the original
- suitability: How well it works as a substitute (high, medium, low)

Only include substitutions that respect the dietary restrictions.
`;
  }
  
  /**
   * Get member preferences
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Member preferences
   * @private
   */
  static async _getMemberPreferences(memberId, tenantId) {
    try {
      // Check cache first
      const cacheKey = `preferences:${memberId}`;
      const cachedPreferences = await redisClient.get(cacheKey);
      
      if (cachedPreferences) {
        return JSON.parse(cachedPreferences);
      }
      
      // In a real implementation, this would query the database
      // For now, return placeholder data
      return {
        likes: ['Italian', 'Mediterranean'],
        dislikes: ['Spicy', 'Seafood'],
        allergies: ['Peanuts'],
        dietaryRestrictions: ['Vegetarian']
      };
    } catch (error) {
      logger.error(`Error getting preferences for member ${memberId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get member dietary restrictions
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Member dietary restrictions
   * @private
   */
  static async _getMemberDietaryRestrictions(memberId, tenantId) {
    try {
      // Check cache first
      const cacheKey = `dietary-restrictions:${memberId}`;
      const cachedRestrictions = await redisClient.get(cacheKey);
      
      if (cachedRestrictions) {
        return JSON.parse(cachedRestrictions);
      }
      
      // In a real implementation, this would query the database
      // For now, return placeholder data
      return {
        restrictions: ['Vegetarian'],
        allergies: ['Peanuts'],
        preferences: ['Low Sodium', 'Low Fat']
      };
    } catch (error) {
      logger.error(`Error getting dietary restrictions for member ${memberId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get member's household
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Household
   * @private
   */
  static async _getMemberHousehold(memberId, tenantId) {
    try {
      const query = `
        SELECT h.id, h.name
        FROM households h
        JOIN household_members m ON h.id = m.household_id
        WHERE m.id = $1 AND h.tenant_id = $2
      `;
      
      const values = [memberId, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting household for member ${memberId}:`, error);
      return null;
    }
  }
}

module.exports = CookingAssistantService;
