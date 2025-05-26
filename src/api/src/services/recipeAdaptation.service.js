const { Recipe } = require('../models');
const PreferenceLearningService = require('./preferenceLearning.service');
const logger = require('../utils/logger');
const ollamaService = require('./ollama.service');
const { redisClient } = require('./redis');

/**
 * RecipeAdaptation service
 * Provides functionality to adapt recipes based on various criteria
 */
class RecipeAdaptationService {
  /**
   * Adapt a recipe based on specified criteria
   * @param {Object} data - Adaptation data
   * @param {string} data.recipeId - Recipe ID
   * @param {string} data.memberId - Member ID
   * @param {Object} data.adaptationCriteria - Criteria for adaptation
   * @param {Array} data.adaptationCriteria.availableIngredients - Available ingredients
   * @param {Array} data.adaptationCriteria.availableEquipment - Available kitchen equipment
   * @param {string} data.adaptationCriteria.skillLevel - Cooking skill level
   * @param {number} data.adaptationCriteria.servingSize - Desired serving size
   * @param {boolean} data.createNewRecipe - Whether to create a new recipe or modify in place
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Adapted recipe
   */
  static async adaptRecipe(data, tenantId) {
    try {
      const { recipeId, memberId, adaptationCriteria, createNewRecipe = false } = data;
      
      // Get original recipe
      const originalRecipe = await this._getRecipeDetails(recipeId, tenantId);
      if (!originalRecipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Get member preferences and dietary restrictions
      const preferences = await PreferenceLearningService._getMemberPreferences(memberId, tenantId);
      const dietaryRestrictions = await PreferenceLearningService._getMemberDietaryRestrictions(memberId, tenantId);
      
      // Apply adaptations based on criteria
      const adaptedRecipe = { ...originalRecipe };
      
      // Apply serving size scaling if needed
      if (adaptationCriteria.servingSize && adaptationCriteria.servingSize !== originalRecipe.servings) {
        await this._scaleRecipe(adaptedRecipe, adaptationCriteria.servingSize);
      }
      
      // Apply ingredient adaptations based on available ingredients
      if (adaptationCriteria.availableIngredients && adaptationCriteria.availableIngredients.length > 0) {
        await this._adaptIngredients(adaptedRecipe, adaptationCriteria.availableIngredients, preferences, dietaryRestrictions);
      }
      
      // Adapt based on equipment constraints
      if (adaptationCriteria.availableEquipment && adaptationCriteria.availableEquipment.length > 0) {
        await this._adaptForEquipment(adaptedRecipe, adaptationCriteria.availableEquipment);
      }
      
      // Adapt based on skill level
      if (adaptationCriteria.skillLevel) {
        await this._adaptForSkillLevel(adaptedRecipe, adaptationCriteria.skillLevel);
      }
      
      // Create a new recipe or return the adapted version
      if (createNewRecipe) {
        const newRecipe = await this._createAdaptedRecipe(adaptedRecipe, originalRecipe.id, memberId, tenantId);
        return {
          original: originalRecipe,
          adapted: newRecipe,
          changes: this._summarizeChanges(originalRecipe, newRecipe)
        };
      } else {
        return {
          original: originalRecipe,
          adapted: adaptedRecipe,
          changes: this._summarizeChanges(originalRecipe, adaptedRecipe)
        };
      }
    } catch (error) {
      logger.error('Error adapting recipe:', error);
      throw error;
    }
  }
  
  /**
   * Scale a recipe to a different serving size
   * @param {Object} recipe - Recipe to scale
   * @param {number} targetServings - Target number of servings
   * @returns {Promise<Object>} Scaled recipe
   */
  static async scaleRecipe(recipeId, targetServings, tenantId) {
    try {
      // Get original recipe
      const originalRecipe = await this._getRecipeDetails(recipeId, tenantId);
      if (!originalRecipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Create a copy of the recipe
      const scaledRecipe = { ...originalRecipe };
      
      // Apply scaling
      await this._scaleRecipe(scaledRecipe, targetServings);
      
      return {
        original: originalRecipe,
        scaled: scaledRecipe,
        changes: this._summarizeChanges(originalRecipe, scaledRecipe)
      };
    } catch (error) {
      logger.error('Error scaling recipe:', error);
      throw error;
    }
  }
  
  /**
   * Find substitutions for an ingredient
   * @param {string} recipeId - Recipe ID
   * @param {string} ingredientName - Ingredient to substitute
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Substitution suggestions
   */
  static async findIngredientSubstitutions(recipeId, ingredientName, memberId, tenantId) {
    try {
      // Get recipe details
      const recipe = await this._getRecipeDetails(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Get member preferences and dietary restrictions
      const preferences = await PreferenceLearningService._getMemberPreferences(memberId, tenantId);
      const dietaryRestrictions = await PreferenceLearningService._getMemberDietaryRestrictions(memberId, tenantId);
      
      // Find the ingredient in the recipe
      const ingredientToSubstitute = recipe.ingredients.find(
        ing => ing.name.toLowerCase() === ingredientName.toLowerCase()
      );
      
      if (!ingredientToSubstitute) {
        throw new Error(`Ingredient "${ingredientName}" not found in recipe`);
      }
      
      // Get substitutions
      const substitutions = await this._getIngredientSubstitutions(
        ingredientToSubstitute,
        recipe,
        preferences,
        dietaryRestrictions
      );
      
      return {
        ingredient: ingredientToSubstitute,
        substitutions
      };
    } catch (error) {
      logger.error('Error finding ingredient substitutions:', error);
      throw error;
    }
  }
  
  /**
   * Create a personalized variant of a recipe based on member preferences
   * @param {string} recipeId - Recipe ID
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Personalized recipe
   */
  static async createPersonalizedVariant(recipeId, memberId, tenantId) {
    try {
      // Get original recipe
      const originalRecipe = await this._getRecipeDetails(recipeId, tenantId);
      if (!originalRecipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Get member preferences and dietary restrictions
      const preferences = await PreferenceLearningService._getMemberPreferences(memberId, tenantId);
      const dietaryRestrictions = await PreferenceLearningService._getMemberDietaryRestrictions(memberId, tenantId);
      
      // Get member ratings history
      const ratingHistory = await this._getMemberRatingHistory(memberId, tenantId);
      
      // Create personalized variant
      const personalizedRecipe = await this._createPersonalizedVariant(
        originalRecipe,
        preferences,
        dietaryRestrictions,
        ratingHistory
      );
      
      // Save the personalized variant
      const savedRecipe = await this._createAdaptedRecipe(
        personalizedRecipe,
        originalRecipe.id,
        memberId,
        tenantId
      );
      
      return {
        original: originalRecipe,
        personalized: savedRecipe,
        changes: this._summarizeChanges(originalRecipe, savedRecipe)
      };
    } catch (error) {
      logger.error('Error creating personalized recipe variant:', error);
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
        equipment: [
          'wok or large skillet',
          'knife',
          'cutting board',
          'measuring cups and spoons',
          'rice cooker or pot'
        ],
        difficulty: 'easy',
        tags: ['vegetarian', 'quick', 'asian']
      };
    } catch (error) {
      logger.error(`Error getting recipe ${recipeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Scale a recipe to a different serving size
   * @param {Object} recipe - Recipe to scale
   * @param {number} targetServings - Target number of servings
   * @returns {Promise<void>}
   * @private
   */
  static async _scaleRecipe(recipe, targetServings) {
    try {
      const originalServings = recipe.servings;
      const scaleFactor = targetServings / originalServings;
      
      // Scale ingredient quantities
      recipe.ingredients = recipe.ingredients.map(ingredient => {
        // Only scale numeric quantities
        if (typeof ingredient.quantity === 'number') {
          return {
            ...ingredient,
            quantity: this._scaleQuantity(ingredient.quantity, scaleFactor, ingredient.unit)
          };
        }
        return ingredient;
      });
      
      // Update servings
      recipe.servings = targetServings;
      
      // Adjust cooking time if necessary (not always linear)
      if (scaleFactor > 1.5) {
        recipe.cookTime = Math.round(recipe.cookTime * (1 + (scaleFactor - 1) * 0.5));
      }
      
      // Add note about scaling in instructions if significant change
      if (scaleFactor < 0.5 || scaleFactor > 1.5) {
        recipe.instructions = [
          `Note: This recipe has been scaled from ${originalServings} to ${targetServings} servings. Cooking times may need adjustment.`,
          ...recipe.instructions
        ];
      }
      
      return recipe;
    } catch (error) {
      logger.error('Error scaling recipe:', error);
      throw error;
    }
  }
  
  /**
   * Scale a quantity with appropriate rounding
   * @param {number} quantity - Original quantity
   * @param {number} scaleFactor - Scale factor
   * @param {string} unit - Unit of measurement
   * @returns {number} Scaled quantity
   * @private
   */
  static _scaleQuantity(quantity, scaleFactor, unit) {
    const scaledQuantity = quantity * scaleFactor;
    
    // Different rounding rules based on unit and original quantity
    if (['teaspoon', 'tablespoon', 'cup'].includes(unit)) {
      // Common cooking measurements - round to nearest 1/4
      return Math.round(scaledQuantity * 4) / 4;
    } else if (quantity < 5) {
      // Small quantities - round to nearest 1/2
      return Math.round(scaledQuantity * 2) / 2;
    } else {
      // Larger quantities - round to whole numbers
      return Math.round(scaledQuantity);
    }
  }
  
  /**
   * Adapt recipe ingredients based on available ingredients
   * @param {Object} recipe - Recipe to adapt
   * @param {Array} availableIngredients - Available ingredients
   * @param {Array} preferences - Member preferences
   * @param {Object} dietaryRestrictions - Dietary restrictions
   * @returns {Promise<void>}
   * @private
   */
  static async _adaptIngredients(recipe, availableIngredients, preferences, dietaryRestrictions) {
    try {
      // Convert available ingredients to lowercase for case-insensitive matching
      const availableIngredientsLower = availableIngredients.map(ing => ing.toLowerCase());
      
      // Check each recipe ingredient
      for (let i = 0; i < recipe.ingredients.length; i++) {
        const ingredient = recipe.ingredients[i];
        
        // Check if ingredient is available
        const isAvailable = availableIngredientsLower.some(
          avail => ingredient.name.toLowerCase().includes(avail) || avail.includes(ingredient.name.toLowerCase())
        );
        
        if (!isAvailable) {
          // Get substitutions for this ingredient
          const substitutions = await this._getIngredientSubstitutions(
            ingredient,
            recipe,
            preferences,
            dietaryRestrictions
          );
          
          // Find a substitution that's available
          const availableSubstitution = substitutions.find(sub => 
            availableIngredientsLower.some(
              avail => sub.name.toLowerCase().includes(avail) || avail.includes(sub.name.toLowerCase())
            )
          );
          
          if (availableSubstitution) {
            // Apply the substitution
            recipe.ingredients[i] = {
              name: availableSubstitution.name,
              quantity: ingredient.quantity * (availableSubstitution.conversionRatio || 1),
              unit: ingredient.unit,
              substitutedFor: ingredient.name
            };
            
            // Update instructions if needed
            this._updateInstructionsForSubstitution(recipe, ingredient.name, availableSubstitution);
          } else {
            // Mark as missing if no substitution found
            recipe.ingredients[i] = {
              ...ingredient,
              missing: true
            };
          }
        }
      }
      
      // Add note about adaptations
      recipe.adaptationNotes = recipe.adaptationNotes || [];
      recipe.adaptationNotes.push('Recipe adapted based on available ingredients.');
      
      return recipe;
    } catch (error) {
      logger.error('Error adapting ingredients:', error);
      throw error;
    }
  }
  
  /**
   * Get substitutions for an ingredient
   * @param {Object} ingredient - Ingredient to substitute
   * @param {Object} recipe - Full recipe
   * @param {Array} preferences - Member preferences
   * @param {Object} dietaryRestrictions - Dietary restrictions
   * @returns {Promise<Array>} Substitution suggestions
   * @private
   */
  static async _getIngredientSubstitutions(ingredient, recipe, preferences, dietaryRestrictions) {
    try {
      // Format preferences
      const formattedPreferences = PreferenceLearningService._formatPreferencesForPrompt(preferences);
      
      // Format dietary restrictions
      const formattedRestrictions = PreferenceLearningService._formatRestrictionsForPrompt(dietaryRestrictions);
      
      // Format recipe context
      const recipeContext = `
Recipe: ${recipe.title}
Description: ${recipe.description}
Tags: ${recipe.tags.join(', ')}
`;
      
      // Construct prompt for substitution
      const prompt = `
I need substitution options for ${ingredient.name} in this recipe:

${recipeContext}

User Preferences:
${formattedPreferences}

Dietary Restrictions:
${formattedRestrictions}

Please suggest 3-5 substitutions for ${ingredient.name} that:
1. Would work well in this specific recipe
2. Consider the user's preferences and dietary restrictions
3. Maintain the recipe's flavor profile and integrity
4. Include common ingredients people might have at home

Format your response as a JSON array with these fields for each substitution:
- name: The name of the substitute ingredient
- description: A brief explanation of why it works as a substitute
- conversionRatio: How much to use compared to the original (as a number, e.g., 1 for equal, 0.5 for half)
- flavor: How the flavor compares to the original
- suitability: How well it works as a substitute (high, medium, low)
- instructionChanges: Any changes needed to the cooking instructions

Only include substitutions that respect the dietary restrictions.
`;
      
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
        } else if (Array.isArray(response)) {
          substitutions = response;
        } else {
          substitutions = [];
        }
      } catch (parseError) {
        logger.error('Error parsing substitution response:', parseError);
        substitutions = [];
      }
      
      return substitutions;
    } catch (error) {
      logger.error(`Error getting substitutions for ${ingredient.name}:`, error);
      return [];
    }
  }
  
  /**
   * Update recipe instructions for a substitution
   * @param {Object} recipe - Recipe to update
   * @param {string} originalIngredient - Original ingredient name
   * @param {Object} substitution - Substitution details
   * @private
   */
  static _updateInstructionsForSubstitution(recipe, originalIngredient, substitution) {
    // Add note about substitution
    recipe.adaptationNotes = recipe.adaptationNotes || [];
    recipe.adaptationNotes.push(`Substituted ${substitution.name} for ${originalIngredient}.`);
    
    // Update instructions if specific changes are needed
    if (substitution.instructionChanges) {
      // Add a note at the beginning of instructions
      recipe.instructions = [
        `Note: ${originalIngredient} has been replaced with ${substitution.name}. ${substitution.instructionChanges}`,
        ...recipe.instructions
      ];
    } else {
      // Update any mentions of the ingredient in the instructions
      recipe.instructions = recipe.instructions.map(instruction => {
        if (instruction.toLowerCase().includes(originalIngredient.toLowerCase())) {
          return instruction.replace(
            new RegExp(originalIngredient, 'gi'),
            `${substitution.name} (substituted for ${originalIngredient})`
          );
        }
        return instruction;
      });
    }
  }
  
  /**
   * Adapt recipe based on available equipment
   * @param {Object} recipe - Recipe to adapt
   * @param {Array} availableEquipment - Available kitchen equipment
   * @returns {Promise<void>}
   * @private
   */
  static async _adaptForEquipment(recipe, availableEquipment) {
    try {
      // Convert available equipment to lowercase for case-insensitive matching
      const availableEquipmentLower = availableEquipment.map(eq => eq.toLowerCase());
      
      // Check if recipe requires equipment that's not available
      const requiredEquipment = recipe.equipment || [];
      const missingEquipment = requiredEquipment.filter(
        eq => !availableEquipmentLower.some(
          avail => eq.toLowerCase().includes(avail) || avail.includes(eq.toLowerCase())
        )
      );
      
      if (missingEquipment.length === 0) {
        // All equipment is available
        return recipe;
      }
      
      // Construct prompt for equipment adaptation
      const prompt = `
I need to adapt a recipe because the following equipment is not available:
${missingEquipment.join(', ')}

Recipe: ${recipe.title}
Current instructions:
${recipe.instructions.join('\n')}

Available equipment:
${availableEquipment.join(', ')}

Please modify the cooking instructions to work with the available equipment.
Return the modified instructions as a JSON array of steps.
Also include a brief explanation of the changes made.
`;
      
      // Call Ollama service
      const response = await ollamaService.analyzeDietaryPreferences(prompt);
      
      // Parse the response
      let adaptedInstructions = [];
      let explanation = '';
      
      try {
        if (typeof response === 'string') {
          // Try to extract JSON
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            adaptedInstructions = JSON.parse(jsonMatch[0]);
          }
          
          // Extract explanation
          const explanationMatch = response.match(/explanation:[\s\S]*?(\[|$)/i);
          if (explanationMatch) {
            explanation = explanationMatch[0].replace(/explanation:/i, '').trim();
          }
        } else if (response.instructions) {
          adaptedInstructions = response.instructions;
          explanation = response.explanation || '';
        }
      } catch (parseError) {
        logger.error('Error parsing equipment adaptation response:', parseError);
      }
      
      // Update recipe if we got valid instructions
      if (adaptedInstructions.length > 0) {
        recipe.instructions = adaptedInstructions;
        recipe.adaptationNotes = recipe.adaptationNotes || [];
        recipe.adaptationNotes.push(`Recipe adapted for available equipment: ${explanation}`);
      } else {
        // Add a note about missing equipment
        recipe.adaptationNotes = recipe.adaptationNotes || [];
        recipe.adaptationNotes.push(`Note: This recipe calls for ${missingEquipment.join(', ')}, which is not available.`);
      }
      
      return recipe;
    } catch (error) {
      logger.error('Error adapting for equipment:', error);
      throw error;
    }
  }
  
  /**
   * Adapt recipe based on skill level
   * @param {Object} recipe - Recipe to adapt
   * @param {string} skillLevel - Cooking skill level (beginner, intermediate, advanced)
   * @returns {Promise<void>}
   * @private
   */
  static async _adaptForSkillLevel(recipe, skillLevel) {
    try {
      // Check if adaptation is needed
      const currentDifficulty = recipe.difficulty || 'intermediate';
      
      // Map skill levels to numerical values
      const difficultyMap = {
        'beginner': 1,
        'easy': 1,
        'intermediate': 2,
        'medium': 2,
        'advanced': 3,
        'hard': 3
      };
      
      const currentLevel = difficultyMap[currentDifficulty.toLowerCase()] || 2;
      const targetLevel = difficultyMap[skillLevel.toLowerCase()] || 2;
      
      // If current difficulty matches skill level, no adaptation needed
      if (currentLevel === targetLevel) {
        return recipe;
      }
      
      // Construct prompt for skill level adaptation
      const prompt = `
I need to adapt a recipe to be more suitable for a ${skillLevel} cook.
The current difficulty level is ${currentDifficulty}.

Recipe: ${recipe.title}
Current instructions:
${recipe.instructions.join('\n')}

${targetLevel < currentLevel 
  ? 'Please simplify the instructions and techniques to make them more accessible for a less experienced cook.'
  : 'Please enhance the instructions to be more challenging and educational for a more experienced cook.'}

Return the modified instructions as a JSON array of steps.
Also include a brief explanation of the changes made.
`;
      
      // Call Ollama service
      const response = await ollamaService.analyzeDietaryPreferences(prompt);
      
      // Parse the response
      let adaptedInstructions = [];
      let explanation = '';
      
      try {
        if (typeof response === 'string') {
          // Try to extract JSON
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            adaptedInstructions = JSON.parse(jsonMatch[0]);
          }
          
          // Extract explanation
          const explanationMatch = response.match(/explanation:[\s\S]*?(\[|$)/i);
          if (explanationMatch) {
            explanation = explanationMatch[0].replace(/explanation:/i, '').trim();
          }
        } else if (response.instructions) {
          adaptedInstructions = response.instructions;
          explanation = response.explanation || '';
        }
      } catch (parseError) {
        logger.error('Error parsing skill level adaptation response:', parseError);
      }
      
      // Update recipe if we got valid instructions
      if (adaptedInstructions.length > 0) {
        recipe.instructions = adaptedInstructions;
        recipe.difficulty = skillLevel;
        recipe.adaptationNotes = recipe.adaptationNotes || [];
        recipe.adaptationNotes.push(`Recipe adapted for ${skillLevel} skill level: ${explanation}`);
      }
      
      return recipe;
    } catch (error) {
      logger.error('Error adapting for skill level:', error);
      throw error;
    }
  }
  
  /**
   * Create a personalized variant of a recipe
   * @param {Object} recipe - Original recipe
   * @param {Array} preferences - Member preferences
   * @param {Object} dietaryRestrictions - Dietary restrictions
   * @param {Array} ratingHistory - Member rating history
   * @returns {Promise<Object>} Personalized recipe
   * @private
   */
  static async _createPersonalizedVariant(recipe, preferences, dietaryRestrictions, ratingHistory) {
    try {
      // Format preferences
      const formattedPreferences = PreferenceLearningService._formatPreferencesForPrompt(preferences);
      
      // Format dietary restrictions
      const formattedRestrictions = PreferenceLearningService._formatRestrictionsForPrompt(dietaryRestrictions);
      
      // Format rating history
      let formattedRatingHistory = 'No previous ratings.';
      if (ratingHistory && ratingHistory.length > 0) {
        formattedRatingHistory = ratingHistory.map(rating => 
          `- ${rating.recipe.title}: ${rating.rating}/5 - ${rating.feedback || 'No feedback'}`
        ).join('\n');
      }
      
      // Construct prompt for personalization
      const prompt = `
I need to create a personalized variant of this recipe based on user preferences:

Recipe: ${recipe.title}
Description: ${recipe.description}
Tags: ${recipe.tags.join(', ')}
Ingredients:
${recipe.ingredients.map(ing => `- ${ing.quantity} ${ing.unit} ${ing.name}`).join('\n')}
Instructions:
${recipe.instructions.join('\n')}

User Preferences:
${formattedPreferences}

Dietary Restrictions:
${formattedRestrictions}

User Rating History:
${formattedRatingHistory}

Please create a personalized variant of this recipe that:
1. Aligns with the user's preferences and dietary restrictions
2. Maintains the core identity of the dish
3. Enhances elements the user tends to enjoy based on their rating history
4. Reduces or removes elements the user tends to dislike

Return a complete recipe with:
1. A new title that indicates it's personalized
2. A brief description
3. A complete ingredients list as an array of objects with name, quantity, and unit
4. Step-by-step instructions as an array of strings
5. A brief explanation of how this variant is personalized for the user

Format your response as JSON.
`;
      
      // Call Ollama service
      const response = await ollamaService.analyzeDietaryPreferences(prompt);
      
      // Parse the response
      let personalizedRecipe = { ...recipe };
      
      try {
        if (typeof response === 'string') {
          // Try to extract JSON
          const jsonMatch = response.match(/{[\s\S]*}/);
          if (jsonMatch) {
            const parsedResponse = JSON.parse(jsonMatch[0]);
            
            // Update recipe with personalized data
            personalizedRecipe = {
              ...recipe,
              title: parsedResponse.title || `${recipe.title} (Personalized)`,
              description: parsedResponse.description || recipe.description,
              ingredients: parsedResponse.ingredients || recipe.ingredients,
              instructions: parsedResponse.instructions || recipe.instructions,
              personalizationNotes: parsedResponse.explanation || 'Personalized based on your preferences.'
            };
          }
        } else if (typeof response === 'object') {
          // Update recipe with personalized data
          personalizedRecipe = {
            ...recipe,
            title: response.title || `${recipe.title} (Personalized)`,
            description: response.description || recipe.description,
            ingredients: response.ingredients || recipe.ingredients,
            instructions: response.instructions || recipe.instructions,
            personalizationNotes: response.explanation || 'Personalized based on your preferences.'
          };
        }
      } catch (parseError) {
        logger.error('Error parsing personalized recipe response:', parseError);
      }
      
      return personalizedRecipe;
    } catch (error) {
      logger.error('Error creating personalized recipe variant:', error);
      throw error;
    }
  }
  
  /**
   * Get member rating history
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Rating history
   * @private
   */
  static async _getMemberRatingHistory(memberId, tenantId) {
    try {
      // This would normally use the RecipeRating model
      // For now, return a placeholder implementation
      return [
        {
          recipe: {
            id: 'recipe123',
            title: 'Spicy Thai Curry'
          },
          rating: 5,
          feedback: 'Loved the spice level and flavors!'
        },
        {
          recipe: {
            id: 'recipe456',
            title: 'Mushroom Risotto'
          },
          rating: 4,
          feedback: 'Good but could use more herbs'
        }
      ];
    } catch (error) {
      logger.error(`Error getting rating history for member ${memberId}:`, error);
      return [];
    }
  }
  
  /**
   * Create a new recipe from an adapted recipe
   * @param {Object} adaptedRecipe - Adapted recipe
   * @param {string} originalRecipeId - Original recipe ID
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Saved recipe
   * @private
   */
  static async _createAdaptedRecipe(adaptedRecipe, originalRecipeId, memberId, tenantId) {
    try {
      // This would normally save to the database
      // For now, just return the adapted recipe with a new ID
      return {
        ...adaptedRecipe,
        id: `${originalRecipeId}-adapted-${Date.now()}`,
        originalRecipeId,
        createdBy: memberId,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error creating adapted recipe:', error);
      throw error;
    }
  }
  
  /**
   * Summarize changes between original and adapted recipe
   * @param {Object} originalRecipe - Original recipe
   * @param {Object} adaptedRecipe - Adapted recipe
   * @returns {Object} Summary of changes
   * @private
   */
  static _summarizeChanges(originalRecipe, adaptedRecipe) {
    const changes = {
      title: originalRecipe.title !== adaptedRecipe.title,
      description: originalRecipe.description !== adaptedRecipe.description,
      servings: originalRecipe.servings !== adaptedRecipe.servings,
      prepTime: originalRecipe.prepTime !== adaptedRecipe.prepTime,
      cookTime: originalRecipe.cookTime !== adaptedRecipe.cookTime,
      difficulty: originalRecipe.difficulty !== adaptedRecipe.difficulty,
      ingredientChanges: [],
      instructionChanges: adaptedRecipe.instructions.length !== originalRecipe.instructions.length,
      notes: adaptedRecipe.adaptationNotes || []
    };
    
    // Check for ingredient changes
    if (originalRecipe.ingredients.length !== adaptedRecipe.ingredients.length) {
      changes.ingredientChanges.push('Number of ingredients changed');
    } else {
      for (let i = 0; i < originalRecipe.ingredients.length; i++) {
        const origIng = originalRecipe.ingredients[i];
        const adaptedIng = adaptedRecipe.ingredients[i];
        
        if (origIng.name !== adaptedIng.name) {
          changes.ingredientChanges.push(`Substituted ${adaptedIng.name} for ${origIng.name}`);
        } else if (origIng.quantity !== adaptedIng.quantity) {
          changes.ingredientChanges.push(`Changed quantity of ${origIng.name} from ${origIng.quantity} to ${adaptedIng.quantity}`);
        }
      }
    }
    
    return changes;
  }
}

module.exports = RecipeAdaptationService;
