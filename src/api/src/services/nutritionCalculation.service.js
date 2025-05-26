const logger = require('../utils/logger');
const ollamaService = require('./ollama.service');
const { Recipe } = require('../models');

/**
 * NutritionCalculation service
 * Provides functionality to calculate and manage nutritional information for recipes
 */
class NutritionCalculationService {
  /**
   * Calculate nutritional information for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Nutritional information
   */
  static async calculateNutrition(recipeId, tenantId) {
    try {
      // Get recipe details
      const recipe = await Recipe.getById(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Check if nutrition info already exists and is up to date
      if (recipe.nutrition_info && !this._isNutritionStale(recipe)) {
        return recipe.nutrition_info;
      }
      
      // Calculate nutrition info
      const nutritionInfo = await this._calculateRecipeNutrition(recipe);
      
      // Update recipe with nutrition info
      await Recipe.update(recipeId, { nutrition_info: nutritionInfo }, tenantId);
      
      return nutritionInfo;
    } catch (error) {
      logger.error(`Error calculating nutrition for recipe ${recipeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Update nutritional information when a recipe is scaled
   * @param {string} recipeId - Recipe ID
   * @param {number} servings - New number of servings
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated nutritional information
   */
  static async updateNutritionForScaling(recipeId, servings, tenantId) {
    try {
      // Get recipe details
      const recipe = await Recipe.getById(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // If no nutrition info exists, calculate it first
      if (!recipe.nutrition_info) {
        return await this.calculateNutrition(recipeId, tenantId);
      }
      
      // Calculate scaling factor
      const originalServings = recipe.servings;
      const scaleFactor = servings / originalServings;
      
      // Scale nutrition values
      const scaledNutrition = this._scaleNutritionValues(recipe.nutrition_info, scaleFactor);
      
      return scaledNutrition;
    } catch (error) {
      logger.error(`Error updating nutrition for scaled recipe ${recipeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate nutritional information for a recipe with ingredient substitutions
   * @param {string} recipeId - Recipe ID
   * @param {Array} substitutions - Array of ingredient substitutions
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated nutritional information
   */
  static async calculateNutritionWithSubstitutions(recipeId, substitutions, tenantId) {
    try {
      // Get recipe details
      const recipe = await Recipe.getById(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // If no nutrition info exists, calculate it first
      if (!recipe.nutrition_info) {
        await this.calculateNutrition(recipeId, tenantId);
        // Get updated recipe with nutrition info
        const updatedRecipe = await Recipe.getById(recipeId, tenantId);
        recipe.nutrition_info = updatedRecipe.nutrition_info;
      }
      
      // Apply substitutions to nutrition values
      const updatedNutrition = await this._calculateNutritionWithSubstitutions(
        recipe,
        substitutions
      );
      
      return updatedNutrition;
    } catch (error) {
      logger.error(`Error calculating nutrition with substitutions for recipe ${recipeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate nutritional information for a meal plan
   * @param {string} mealPlanId - Meal Plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Meal plan nutritional summary
   */
  static async calculateMealPlanNutrition(mealPlanId, tenantId) {
    try {
      // This would normally use the MealPlan model
      // For now, use a placeholder implementation
      const mealPlan = {
        id: mealPlanId,
        items: [
          { recipeId: 'recipe1', servings: 2 },
          { recipeId: 'recipe2', servings: 4 },
          { recipeId: 'recipe3', servings: 3 }
        ]
      };
      
      // Calculate nutrition for each recipe in the meal plan
      const mealNutrition = [];
      for (const item of mealPlan.items) {
        try {
          // Get recipe nutrition, scaled to the correct servings
          const nutrition = await this.updateNutritionForScaling(
            item.recipeId,
            item.servings,
            tenantId
          );
          
          mealNutrition.push({
            recipeId: item.recipeId,
            servings: item.servings,
            nutrition
          });
        } catch (error) {
          logger.error(`Error calculating nutrition for meal plan item ${item.recipeId}:`, error);
          // Continue with other items even if one fails
        }
      }
      
      // Calculate daily and weekly totals
      const dailyTotals = this._calculateDailyNutritionTotals(mealNutrition);
      const weeklyTotals = this._calculateWeeklyNutritionTotals(dailyTotals);
      
      // Generate nutritional insights
      const insights = this._generateNutritionalInsights(dailyTotals, weeklyTotals);
      
      return {
        mealNutrition,
        dailyTotals,
        weeklyTotals,
        insights
      };
    } catch (error) {
      logger.error(`Error calculating nutrition for meal plan ${mealPlanId}:`, error);
      throw error;
    }
  }
  
  /**
   * Compare nutritional information against dietary goals
   * @param {string} memberId - Member ID
   * @param {string} mealPlanId - Meal Plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Comparison results and recommendations
   */
  static async compareNutritionToDietaryGoals(memberId, mealPlanId, tenantId) {
    try {
      // Get member's dietary goals
      const dietaryGoals = await this._getMemberDietaryGoals(memberId, tenantId);
      
      // Get meal plan nutrition
      const mealPlanNutrition = await this.calculateMealPlanNutrition(mealPlanId, tenantId);
      
      // Compare nutrition to goals
      const comparison = this._compareNutritionToGoals(
        mealPlanNutrition.weeklyTotals,
        dietaryGoals
      );
      
      // Generate recommendations
      const recommendations = await this._generateDietaryRecommendations(
        comparison,
        mealPlanId,
        memberId,
        tenantId
      );
      
      return {
        comparison,
        recommendations
      };
    } catch (error) {
      logger.error(`Error comparing nutrition to dietary goals for member ${memberId}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if nutrition information is stale and needs recalculation
   * @param {Object} recipe - Recipe object
   * @returns {boolean} True if nutrition info is stale
   * @private
   */
  static _isNutritionStale(recipe) {
    // If no nutrition info exists, it's stale
    if (!recipe.nutrition_info) {
      return true;
    }
    
    // If recipe has been updated since nutrition was calculated, it's stale
    if (recipe.nutrition_info.calculatedAt) {
      const calculatedAt = new Date(recipe.nutrition_info.calculatedAt);
      const updatedAt = new Date(recipe.updatedAt);
      return updatedAt > calculatedAt;
    }
    
    // Default to stale if we can't determine
    return true;
  }
  
  /**
   * Calculate nutritional information for a recipe
   * @param {Object} recipe - Recipe object
   * @returns {Promise<Object>} Nutritional information
   * @private
   */
  static async _calculateRecipeNutrition(recipe) {
    try {
      // Format ingredients for the prompt
      const ingredientsText = recipe.ingredients.map(ing => 
        `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`
      ).join('\n');
      
      // Construct prompt for nutrition calculation
      const prompt = `
Calculate the nutritional information for the following recipe. 
The recipe serves ${recipe.servings} people.

Recipe: ${recipe.title}
Ingredients:
${ingredientsText}

Please provide a comprehensive nutritional analysis including:
1. Calories per serving
2. Macronutrients (protein, carbohydrates, fat) in grams per serving
3. Fiber in grams per serving
4. Sugar in grams per serving
5. Sodium in milligrams per serving
6. Key vitamins and minerals as percentage of daily value per serving
7. Common allergens present in the recipe
8. Whether the recipe is suitable for common diets (vegetarian, vegan, gluten-free, etc.)

Return the results as a JSON object with these fields:
- calories: number (per serving)
- protein: number (grams per serving)
- carbohydrates: number (grams per serving)
- fat: number (grams per serving)
- saturatedFat: number (grams per serving)
- transFat: number (grams per serving)
- cholesterol: number (milligrams per serving)
- fiber: number (grams per serving)
- sugar: number (grams per serving)
- sodium: number (milligrams per serving)
- vitamins: object with vitamin names and percentage of daily value
- minerals: object with mineral names and percentage of daily value
- allergens: array of allergens present
- suitableDiets: array of diets this recipe is suitable for
- calculatedAt: current timestamp

Only include the JSON object in your response, no additional text.
`;
      
      // Call Ollama service
      const response = await ollamaService.analyzeDietaryPreferences(prompt);
      
      // Parse the response
      let nutritionInfo = {};
      
      try {
        if (typeof response === 'string') {
          // Try to extract JSON
          const jsonMatch = response.match(/{[\s\S]*}/);
          if (jsonMatch) {
            nutritionInfo = JSON.parse(jsonMatch[0]);
          }
        } else if (typeof response === 'object') {
          nutritionInfo = response;
        }
      } catch (parseError) {
        logger.error('Error parsing nutrition calculation response:', parseError);
        throw new Error('Failed to parse nutrition information');
      }
      
      // Add calculatedAt timestamp if not present
      if (!nutritionInfo.calculatedAt) {
        nutritionInfo.calculatedAt = new Date().toISOString();
      }
      
      // Add per recipe totals
      nutritionInfo.perRecipe = this._calculatePerRecipeTotals(nutritionInfo, recipe.servings);
      
      return nutritionInfo;
    } catch (error) {
      logger.error(`Error calculating nutrition for recipe ${recipe.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate per recipe totals from per serving values
   * @param {Object} nutrition - Nutrition information per serving
   * @param {number} servings - Number of servings
   * @returns {Object} Nutrition information for entire recipe
   * @private
   */
  static _calculatePerRecipeTotals(nutrition, servings) {
    const perRecipe = {};
    
    // Numeric fields to multiply by servings
    const numericFields = [
      'calories', 'protein', 'carbohydrates', 'fat', 
      'saturatedFat', 'transFat', 'cholesterol', 
      'fiber', 'sugar', 'sodium'
    ];
    
    for (const field of numericFields) {
      if (typeof nutrition[field] === 'number') {
        perRecipe[field] = nutrition[field] * servings;
      }
    }
    
    return perRecipe;
  }
  
  /**
   * Scale nutrition values based on serving size changes
   * @param {Object} nutrition - Original nutrition information
   * @param {number} scaleFactor - Scale factor
   * @returns {Object} Scaled nutrition information
   * @private
   */
  static _scaleNutritionValues(nutrition, scaleFactor) {
    const scaledNutrition = { ...nutrition };
    
    // Numeric fields to scale
    const numericFields = [
      'calories', 'protein', 'carbohydrates', 'fat', 
      'saturatedFat', 'transFat', 'cholesterol', 
      'fiber', 'sugar', 'sodium'
    ];
    
    // Scale per serving values
    for (const field of numericFields) {
      if (typeof scaledNutrition[field] === 'number') {
        scaledNutrition[field] = Math.round((scaledNutrition[field] * scaleFactor) * 10) / 10;
      }
    }
    
    // Scale per recipe values
    if (scaledNutrition.perRecipe) {
      for (const field of numericFields) {
        if (typeof scaledNutrition.perRecipe[field] === 'number') {
          scaledNutrition.perRecipe[field] = Math.round((scaledNutrition.perRecipe[field] * scaleFactor) * 10) / 10;
        }
      }
    }
    
    // Update calculatedAt timestamp
    scaledNutrition.calculatedAt = new Date().toISOString();
    scaledNutrition.scaled = true;
    
    return scaledNutrition;
  }
  
  /**
   * Calculate nutrition with ingredient substitutions
   * @param {Object} recipe - Recipe object
   * @param {Array} substitutions - Array of ingredient substitutions
   * @returns {Promise<Object>} Updated nutritional information
   * @private
   */
  static async _calculateNutritionWithSubstitutions(recipe, substitutions) {
    try {
      // Format original ingredients
      const originalIngredientsText = recipe.ingredients.map(ing => 
        `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`
      ).join('\n');
      
      // Format substitutions
      const substitutionsText = substitutions.map(sub => 
        `${sub.original} -> ${sub.quantity || ''} ${sub.unit || ''} ${sub.substitute}`
      ).join('\n');
      
      // Construct prompt for nutrition calculation with substitutions
      const prompt = `
Calculate how the nutritional information changes with these ingredient substitutions.

Original Recipe: ${recipe.title}
Serves: ${recipe.servings}

Original Ingredients:
${originalIngredientsText}

Substitutions:
${substitutionsText}

Original Nutrition Information (per serving):
Calories: ${recipe.nutrition_info.calories || 'unknown'}
Protein: ${recipe.nutrition_info.protein || 'unknown'}g
Carbohydrates: ${recipe.nutrition_info.carbohydrates || 'unknown'}g
Fat: ${recipe.nutrition_info.fat || 'unknown'}g
Fiber: ${recipe.nutrition_info.fiber || 'unknown'}g
Sugar: ${recipe.nutrition_info.sugar || 'unknown'}g
Sodium: ${recipe.nutrition_info.sodium || 'unknown'}mg

Please calculate the updated nutritional information with these substitutions.
Return the results as a JSON object with these fields:
- calories: number (per serving)
- protein: number (grams per serving)
- carbohydrates: number (grams per serving)
- fat: number (grams per serving)
- saturatedFat: number (grams per serving)
- transFat: number (grams per serving)
- cholesterol: number (milligrams per serving)
- fiber: number (grams per serving)
- sugar: number (grams per serving)
- sodium: number (milligrams per serving)
- vitamins: object with vitamin names and percentage of daily value
- minerals: object with mineral names and percentage of daily value
- allergens: array of allergens present
- suitableDiets: array of diets this recipe is suitable for
- calculatedAt: current timestamp
- nutritionalChanges: object describing the significant changes in nutrition

Only include the JSON object in your response, no additional text.
`;
      
      // Call Ollama service
      const response = await ollamaService.analyzeDietaryPreferences(prompt);
      
      // Parse the response
      let updatedNutrition = {};
      
      try {
        if (typeof response === 'string') {
          // Try to extract JSON
          const jsonMatch = response.match(/{[\s\S]*}/);
          if (jsonMatch) {
            updatedNutrition = JSON.parse(jsonMatch[0]);
          }
        } else if (typeof response === 'object') {
          updatedNutrition = response;
        }
      } catch (parseError) {
        logger.error('Error parsing nutrition with substitutions response:', parseError);
        throw new Error('Failed to parse updated nutrition information');
      }
      
      // Add calculatedAt timestamp if not present
      if (!updatedNutrition.calculatedAt) {
        updatedNutrition.calculatedAt = new Date().toISOString();
      }
      
      // Add per recipe totals
      updatedNutrition.perRecipe = this._calculatePerRecipeTotals(updatedNutrition, recipe.servings);
      
      // Add substitution information
      updatedNutrition.substitutions = substitutions;
      
      return updatedNutrition;
    } catch (error) {
      logger.error(`Error calculating nutrition with substitutions for recipe ${recipe.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate daily nutrition totals from meal nutrition
   * @param {Array} mealNutrition - Array of meal nutrition objects
   * @returns {Array} Daily nutrition totals
   * @private
   */
  static _calculateDailyNutritionTotals(mealNutrition) {
    // This is a placeholder implementation
    // In a real implementation, meals would be grouped by day
    // and totals calculated for each day
    return [
      {
        day: 1,
        calories: 2100,
        protein: 95,
        carbohydrates: 240,
        fat: 70,
        fiber: 28,
        sugar: 45,
        sodium: 2300
      },
      {
        day: 2,
        calories: 2200,
        protein: 100,
        carbohydrates: 250,
        fat: 75,
        fiber: 30,
        sugar: 40,
        sodium: 2100
      }
    ];
  }
  
  /**
   * Calculate weekly nutrition totals from daily totals
   * @param {Array} dailyTotals - Array of daily nutrition totals
   * @returns {Object} Weekly nutrition totals
   * @private
   */
  static _calculateWeeklyNutritionTotals(dailyTotals) {
    // Initialize weekly totals
    const weeklyTotals = {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    };
    
    // Sum daily totals
    for (const day of dailyTotals) {
      weeklyTotals.calories += day.calories || 0;
      weeklyTotals.protein += day.protein || 0;
      weeklyTotals.carbohydrates += day.carbohydrates || 0;
      weeklyTotals.fat += day.fat || 0;
      weeklyTotals.fiber += day.fiber || 0;
      weeklyTotals.sugar += day.sugar || 0;
      weeklyTotals.sodium += day.sodium || 0;
    }
    
    // Calculate daily averages
    const days = dailyTotals.length;
    weeklyTotals.dailyAverage = {
      calories: Math.round(weeklyTotals.calories / days),
      protein: Math.round(weeklyTotals.protein / days * 10) / 10,
      carbohydrates: Math.round(weeklyTotals.carbohydrates / days * 10) / 10,
      fat: Math.round(weeklyTotals.fat / days * 10) / 10,
      fiber: Math.round(weeklyTotals.fiber / days * 10) / 10,
      sugar: Math.round(weeklyTotals.sugar / days * 10) / 10,
      sodium: Math.round(weeklyTotals.sodium / days)
    };
    
    return weeklyTotals;
  }
  
  /**
   * Generate nutritional insights from daily and weekly totals
   * @param {Array} dailyTotals - Array of daily nutrition totals
   * @param {Object} weeklyTotals - Weekly nutrition totals
   * @returns {Object} Nutritional insights
   * @private
   */
  static _generateNutritionalInsights(dailyTotals, weeklyTotals) {
    // This would normally use more sophisticated analysis
    // For now, return a placeholder implementation
    return {
      macronutrientBalance: {
        protein: {
          percentage: 18,
          assessment: "Adequate protein intake for most adults"
        },
        carbohydrates: {
          percentage: 52,
          assessment: "Carbohydrate intake within recommended range"
        },
        fat: {
          percentage: 30,
          assessment: "Fat intake within recommended range"
        }
      },
      nutritionalStrengths: [
        "Good fiber intake averaging 29g per day",
        "Balanced macronutrient distribution",
        "Moderate sodium levels"
      ],
      nutritionalWeaknesses: [
        "Sugar intake slightly above recommended levels",
        "Vitamin D levels could be improved"
      ],
      dayToDay: {
        consistency: "Good consistency in calorie and macronutrient intake across the week",
        variability: "Good variety of nutrients from different food sources"
      },
      recommendations: [
        "Consider reducing added sugar intake",
        "Include more vitamin D-rich foods like fatty fish or fortified products",
        "Maintain current fiber intake from whole grains, fruits, and vegetables"
      ]
    };
  }
  
  /**
   * Get member's dietary goals
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Dietary goals
   * @private
   */
  static async _getMemberDietaryGoals(memberId, tenantId) {
    try {
      // This would normally use a DietaryGoals model
      // For now, return a placeholder implementation
      return {
        calories: {
          target: 2000,
          range: { min: 1800, max: 2200 }
        },
        macronutrients: {
          protein: {
            target: 100, // grams
            range: { min: 80, max: 120 }
          },
          carbohydrates: {
            target: 250, // grams
            range: { min: 225, max: 275 }
          },
          fat: {
            target: 65, // grams
            range: { min: 55, max: 75 }
          }
        },
        micronutrients: {
          fiber: {
            target: 30, // grams
            min: 25
          },
          sugar: {
            max: 50 // grams
          },
          sodium: {
            max: 2300 // milligrams
          }
        },
        dietaryPatterns: ["moderate-carb", "high-protein"],
        healthGoals: ["weight-maintenance", "heart-health"]
      };
    } catch (error) {
      logger.error(`Error getting dietary goals for member ${memberId}:`, error);
      return {};
    }
  }
  
  /**
   * Compare nutrition to dietary goals
   * @param {Object} nutrition - Nutrition information
   * @param {Object} goals - Dietary goals
   * @returns {Object} Comparison results
   * @private
   */
  static _compareNutritionToGoals(nutrition, goals) {
    const comparison = {
      calories: {
        actual: nutrition.dailyAverage.calories,
        target: goals.calories.target,
        difference: nutrition.dailyAverage.calories - goals.calories.target,
        percentOfTarget: Math.round((nutrition.dailyAverage.calories / goals.calories.target) * 100),
        withinRange: nutrition.dailyAverage.calories >= goals.calories.range.min && 
                    nutrition.dailyAverage.calories <= goals.calories.range.max
      },
      macronutrients: {
        protein: {
          actual: nutrition.dailyAverage.protein,
          target: goals.macronutrients.protein.target,
          difference: nutrition.dailyAverage.protein - goals.macronutrients.protein.target,
          percentOfTarget: Math.round((nutrition.dailyAverage.protein / goals.macronutrients.protein.target) * 100),
          withinRange: nutrition.dailyAverage.protein >= goals.macronutrients.protein.range.min && 
                      nutrition.dailyAverage.protein <= goals.macronutrients.protein.range.max
        },
        carbohydrates: {
          actual: nutrition.dailyAverage.carbohydrates,
          target: goals.macronutrients.carbohydrates.target,
          difference: nutrition.dailyAverage.carbohydrates - goals.macronutrients.carbohydrates.target,
          percentOfTarget: Math.round((nutrition.dailyAverage.carbohydrates / goals.macronutrients.carbohydrates.target) * 100),
          withinRange: nutrition.dailyAverage.carbohydrates >= goals.macronutrients.carbohydrates.range.min && 
                      nutrition.dailyAverage.carbohydrates <= goals.macronutrients.carbohydrates.range.max
        },
        fat: {
          actual: nutrition.dailyAverage.fat,
          target: goals.macronutrients.fat.target,
          difference: nutrition.dailyAverage.fat - goals.macronutrients.fat.target,
          percentOfTarget: Math.round((nutrition.dailyAverage.fat / goals.macronutrients.fat.target) * 100),
          withinRange: nutrition.dailyAverage.fat >= goals.macronutrients.fat.range.min && 
                      nutrition.dailyAverage.fat <= goals.macronutrients.fat.range.max
        }
      },
      micronutrients: {
        fiber: {
          actual: nutrition.dailyAverage.fiber,
          target: goals.micronutrients.fiber.target,
          difference: nutrition.dailyAverage.fiber - goals.micronutrients.fiber.target,
          percentOfTarget: Math.round((nutrition.dailyAverage.fiber / goals.micronutrients.fiber.target) * 100),
          meetsMinimum: nutrition.dailyAverage.fiber >= goals.micronutrients.fiber.min
        },
        sugar: {
          actual: nutrition.dailyAverage.sugar,
          max: goals.micronutrients.sugar.max,
          difference: nutrition.dailyAverage.sugar - goals.micronutrients.sugar.max,
          percentOfMax: Math.round((nutrition.dailyAverage.sugar / goals.micronutrients.sugar.max) * 100),
          withinLimit: nutrition.dailyAverage.sugar <= goals.micronutrients.sugar.max
        },
        sodium: {
          actual: nutrition.dailyAverage.sodium,
          max: goals.micronutrients.sodium.max,
          difference: nutrition.dailyAverage.sodium - goals.micronutrients.sodium.max,
          percentOfMax: Math.round((nutrition.dailyAverage.sodium / goals.micronutrients.sodium.max) * 100),
          withinLimit: nutrition.dailyAverage.sodium <= goals.micronutrients.sodium.max
        }
      }
    };
    
    // Calculate overall adherence score
    let adherencePoints = 0;
    let totalPoints = 0;
    
    // Calories
    if (comparison.calories.withinRange) adherencePoints += 1;
    totalPoints += 1;
    
    // Macronutrients
    if (comparison.macronutrients.protein.withinRange) adherencePoints += 1;
    if (comparison.macronutrients.carbohydrates.withinRange) adherencePoints += 1;
    if (comparison.macronutrients.fat.withinRange) adherencePoints += 1;
    totalPoints += 3;
    
    // Micronutrients
    if (comparison.micronutrients.fiber.meetsMinimum) adherencePoints += 1;
    if (comparison.micronutrients.sugar.withinLimit) adherencePoints += 1;
    if (comparison.micronutrients.sodium.withinLimit) adherencePoints += 1;
    totalPoints += 3;
    
    comparison.overallAdherence = {
      score: Math.round((adherencePoints / totalPoints) * 100),
      rating: adherencePoints >= totalPoints * 0.8 ? 'Excellent' :
              adherencePoints >= totalPoints * 0.6 ? 'Good' :
              adherencePoints >= totalPoints * 0.4 ? 'Fair' : 'Needs Improvement'
    };
    
    return comparison;
  }
  
  /**
   * Generate dietary recommendations based on comparison to goals
   * @param {Object} comparison - Comparison results
   * @param {string} mealPlanId - Meal Plan ID
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Recommendations
   * @private
   */
  static async _generateDietaryRecommendations(comparison, mealPlanId, memberId, tenantId) {
    try {
      // Identify areas that need improvement
      const improvements = [];
      
      // Check calories
      if (!comparison.calories.withinRange) {
        if (comparison.calories.difference > 0) {
          improvements.push({
            nutrient: 'calories',
            issue: 'excess',
            difference: comparison.calories.difference,
            recommendation: 'Reduce overall calorie intake'
          });
        } else {
          improvements.push({
            nutrient: 'calories',
            issue: 'deficiency',
            difference: Math.abs(comparison.calories.difference),
            recommendation: 'Increase overall calorie intake'
          });
        }
      }
      
      // Check macronutrients
      for (const macro of ['protein', 'carbohydrates', 'fat']) {
        if (!comparison.macronutrients[macro].withinRange) {
          if (comparison.macronutrients[macro].difference > 0) {
            improvements.push({
              nutrient: macro,
              issue: 'excess',
              difference: comparison.macronutrients[macro].difference,
              recommendation: `Reduce ${macro} intake`
            });
          } else {
            improvements.push({
              nutrient: macro,
              issue: 'deficiency',
              difference: Math.abs(comparison.macronutrients[macro].difference),
              recommendation: `Increase ${macro} intake`
            });
          }
        }
      }
      
      // Check micronutrients
      if (!comparison.micronutrients.fiber.meetsMinimum) {
        improvements.push({
          nutrient: 'fiber',
          issue: 'deficiency',
          difference: Math.abs(comparison.micronutrients.fiber.difference),
          recommendation: 'Increase fiber intake'
        });
      }
      
      if (!comparison.micronutrients.sugar.withinLimit) {
        improvements.push({
          nutrient: 'sugar',
          issue: 'excess',
          difference: comparison.micronutrients.sugar.difference,
          recommendation: 'Reduce sugar intake'
        });
      }
      
      if (!comparison.micronutrients.sodium.withinLimit) {
        improvements.push({
          nutrient: 'sodium',
          issue: 'excess',
          difference: comparison.micronutrients.sodium.difference,
          recommendation: 'Reduce sodium intake'
        });
      }
      
      // Generate specific recommendations based on improvements needed
      const specificRecommendations = await this._generateSpecificRecommendations(
        improvements,
        mealPlanId,
        memberId,
        tenantId
      );
      
      return {
        improvements,
        specificRecommendations,
        overallAssessment: comparison.overallAdherence.rating,
        score: comparison.overallAdherence.score
      };
    } catch (error) {
      logger.error('Error generating dietary recommendations:', error);
      return {
        improvements: [],
        specificRecommendations: [],
        overallAssessment: 'Unable to generate recommendations',
        score: 0
      };
    }
  }
  
  /**
   * Generate specific recommendations for dietary improvements
   * @param {Array} improvements - Areas needing improvement
   * @param {string} mealPlanId - Meal Plan ID
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Specific recommendations
   * @private
   */
  static async _generateSpecificRecommendations(improvements, mealPlanId, memberId, tenantId) {
    try {
      if (improvements.length === 0) {
        return [{
          type: 'general',
          text: 'Your meal plan meets your dietary goals. Continue with your current eating pattern.'
        }];
      }
      
      // Format improvements for the prompt
      const improvementsText = improvements.map(imp => 
        `${imp.nutrient}: ${imp.issue} of ${imp.difference} ${imp.nutrient === 'calories' ? 'kcal' : 'g'}`
      ).join('\n');
      
      // Construct prompt for specific recommendations
      const prompt = `
Generate specific dietary recommendations for a meal plan that needs the following improvements:

${improvementsText}

Please provide:
1. 3-5 specific food recommendations to add or reduce
2. 1-2 recipe modification suggestions
3. 1-2 meal timing or portion size recommendations

Format your response as a JSON array of recommendation objects with these fields:
- type: "food", "recipe", or "habit"
- text: The specific recommendation text
- impact: Which nutritional aspect this addresses (e.g., "protein", "calories")
- action: "increase" or "decrease"

Only include the JSON array in your response, no additional text.
`;
      
      // Call Ollama service
      const response = await ollamaService.analyzeDietaryPreferences(prompt);
      
      // Parse the response
      let recommendations = [];
      
      try {
        if (typeof response === 'string') {
          // Try to extract JSON
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            recommendations = JSON.parse(jsonMatch[0]);
          }
        } else if (Array.isArray(response)) {
          recommendations = response;
        }
      } catch (parseError) {
        logger.error('Error parsing specific recommendations response:', parseError);
        recommendations = [{
          type: 'general',
          text: 'Consider consulting with a nutritionist for personalized dietary advice.',
          impact: 'overall',
          action: 'consult'
        }];
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating specific recommendations:', error);
      return [{
        type: 'general',
        text: 'Consider consulting with a nutritionist for personalized dietary advice.',
        impact: 'overall',
        action: 'consult'
      }];
    }
  }
}

module.exports = NutritionCalculationService;
