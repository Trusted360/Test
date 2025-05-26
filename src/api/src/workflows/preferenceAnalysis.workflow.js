const BaseWorkflow = require('./base.workflow');
const { LLMChain } = require('@langchain/core/chains');
const { PromptTemplate } = require('@langchain/core/prompts');
const { Ollama } = require('@langchain/community/llms/ollama');
const { HouseholdService } = require('../services/household.service');
const { MealPlanService } = require('../services/mealPlan.service');
const { RecipeService } = require('../services/recipe.service');
const logger = require('../utils/logger');

class PreferenceAnalysisWorkflow extends BaseWorkflow {
    constructor(config = {}) {
        super(config);
        this.householdService = new HouseholdService();
        this.mealPlanService = new MealPlanService();
        this.recipeService = new RecipeService();
    }

    async initialize() {
        // Initialize Ollama model
        const model = new Ollama({
            baseUrl: this.config.ollamaUrl || 'http://ollama:11434',
            model: this.config.model || 'llama3',
            temperature: 0.3,
        });

        // Create prompt template for preference analysis
        const promptTemplate = new PromptTemplate({
            template: `Analyze the following household preferences and meal history to provide insights. Return JSON with these fields:
            - preferenceInsights: Object containing:
              - favoriteCuisines: Array of preferred cuisines with confidence scores
              - favoriteIngredients: Array of preferred ingredients with confidence scores
              - mealTimePreferences: Object with preferred meal times and durations
              - dietaryPatterns: Object showing dietary pattern analysis
              - cookingStylePreferences: Array of preferred cooking styles
            - conflictAnalysis: Object containing:
              - memberConflicts: Array of preference conflicts between members
              - resolutionSuggestions: Array of suggestions to resolve conflicts
            - nutritionalInsights: Object containing:
              - nutritionalGaps: Array of identified nutritional gaps
              - improvementSuggestions: Array of suggestions to improve nutrition
            - mealPlanningInsights: Object containing:
              - varietyScore: Score indicating meal variety (1-10)
              - repetitionPatterns: Array of identified repetition patterns
              - improvementAreas: Array of areas for meal plan improvement
            - recommendations: Array of specific recommendations for future meal plans

            Household Information:
            {householdData}

            Meal History:
            {mealHistoryData}

            Recipe Data:
            {recipeData}

            Return ONLY valid JSON without any explanation.`,
            inputVariables: ['householdData', 'mealHistoryData', 'recipeData'],
        });

        // Initialize the chain
        this.chain = new LLMChain({
            llm: model,
            prompt: promptTemplate,
        });
    }

    async validateInput(input) {
        if (!input.householdId) {
            throw new Error('Household ID is required');
        }
        return input;
    }

    async getHouseholdData(householdId) {
        try {
            const household = await this.householdService.getHouseholdById(householdId);
            if (!household) {
                throw new Error(`Household not found: ${householdId}`);
            }
            return {
                id: household.id,
                name: household.name,
                members: household.members.map(member => ({
                    id: member.id,
                    name: member.name,
                    dietaryRestrictions: member.dietaryRestrictions,
                    preferences: member.preferences,
                    mealPreferences: member.mealPreferences
                }))
            };
        } catch (error) {
            this.logger.error(`Failed to fetch household ${householdId}:`, error);
            throw error;
        }
    }

    async getMealHistory(householdId) {
        try {
            const mealHistory = await this.mealPlanService.getMealHistory(householdId, {
                limit: 30, // Last 30 days
                includeFeedback: true
            });
            return mealHistory.map(meal => ({
                date: meal.date,
                mealType: meal.mealType,
                recipeId: meal.recipeId,
                feedback: meal.feedback,
                substitutions: meal.substitutions,
                notes: meal.notes
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch meal history for household ${householdId}:`, error);
            throw error;
        }
    }

    async getRecipeData(recipeIds) {
        try {
            const recipes = await this.recipeService.getRecipesByIds(recipeIds);
            return recipes.map(recipe => ({
                id: recipe.id,
                title: recipe.title,
                cuisine: recipe.cuisine,
                ingredients: recipe.ingredients,
                tags: recipe.tags,
                dietaryClassifications: recipe.dietaryClassifications,
                nutritionInfo: recipe.nutritionInfo,
                difficulty: recipe.difficulty,
                prepTime: recipe.prepTime,
                cookTime: recipe.cookTime
            }));
        } catch (error) {
            this.logger.error('Failed to fetch recipe data:', error);
            throw error;
        }
    }

    async execute(input) {
        try {
            await this.validateInput(input);
            
            // Fetch required data
            const householdData = await this.getHouseholdData(input.householdId);
            const mealHistory = await this.getMealHistory(input.householdId);
            
            // Extract unique recipe IDs from meal history
            const recipeIds = [...new Set(mealHistory.map(meal => meal.recipeId))];
            const recipeData = await this.getRecipeData(recipeIds);
            
            // Generate preference analysis using LangChain
            const result = await super.execute({
                householdData: JSON.stringify(householdData, null, 2),
                mealHistoryData: JSON.stringify(mealHistory, null, 2),
                recipeData: JSON.stringify(recipeData, null, 2)
            });
            
            // Parse and validate the analysis results
            const analysisData = JSON.parse(result.text);
            
            // Update household preferences with insights
            await this.householdService.updateHouseholdPreferences(input.householdId, {
                preferenceInsights: analysisData.preferenceInsights,
                lastAnalysisDate: new Date().toISOString()
            });
            
            return {
                success: true,
                analysis: analysisData,
                householdId: input.householdId
            };
        } catch (error) {
            return await this.handleError(error);
        }
    }

    async handleError(error) {
        this.logger.error('Preference analysis workflow error:', error);
        return {
            success: false,
            error: error.message,
            householdId: error.householdId
        };
    }
}

module.exports = PreferenceAnalysisWorkflow; 