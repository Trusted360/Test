const BaseWorkflow = require('./base.workflow');
const { LLMChain } = require('@langchain/core/chains');
const { PromptTemplate } = require('@langchain/core/prompts');
const { Ollama } = require('@langchain/community/llms/ollama');
const { MealPlanService } = require('../services/mealPlan.service');
const { RecipeService } = require('../services/recipe.service');
const { HouseholdService } = require('../services/household.service');
const logger = require('../utils/logger');

class MealPlanGenerationWorkflow extends BaseWorkflow {
    constructor(config = {}) {
        super(config);
        this.mealPlanService = new MealPlanService();
        this.recipeService = new RecipeService();
        this.householdService = new HouseholdService();
    }

    async initialize() {
        // Initialize Ollama model
        const model = new Ollama({
            baseUrl: this.config.ollamaUrl || 'http://ollama:11434',
            model: this.config.model || 'llama3',
            temperature: 0.7,
        });

        // Create prompt template for meal plan generation
        const promptTemplate = new PromptTemplate({
            template: `Generate a personalized meal plan based on the following information. Return JSON with these fields:
            - meals: Array of daily meal plans, each containing:
              - day: Day of the week
              - breakfast: Recipe ID and notes
              - lunch: Recipe ID and notes
              - dinner: Recipe ID and notes
              - snacks: Array of snack recipes with notes
            - totalNutrition: Overall nutrition summary
            - varietyScore: Score indicating meal variety (1-10)
            - dietaryCompliance: Object showing compliance with dietary restrictions
            - shoppingList: Array of ingredients needed
            - notes: Array of meal plan notes and suggestions

            Household Information:
            {householdData}

            Available Recipes:
            {recipeData}

            Preferences and Restrictions:
            {preferencesData}

            Return ONLY valid JSON without any explanation.`,
            inputVariables: ['householdData', 'recipeData', 'preferencesData'],
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
        if (!input.startDate) {
            throw new Error('Start date is required');
        }
        if (!input.duration) {
            throw new Error('Duration is required');
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
                    preferences: member.preferences
                }))
            };
        } catch (error) {
            this.logger.error(`Failed to fetch household ${householdId}:`, error);
            throw error;
        }
    }

    async getAvailableRecipes() {
        try {
            const recipes = await this.recipeService.getRecipes({
                limit: 100,
                enriched: true
            });
            return recipes.map(recipe => ({
                id: recipe.id,
                title: recipe.title,
                description: recipe.description,
                difficulty: recipe.difficulty,
                prepTime: recipe.prepTime,
                cookTime: recipe.cookTime,
                servings: recipe.servings,
                tags: recipe.tags,
                dietaryClassifications: recipe.dietaryClassifications,
                nutritionInfo: recipe.nutritionInfo
            }));
        } catch (error) {
            this.logger.error('Failed to fetch available recipes:', error);
            throw error;
        }
    }

    async execute(input) {
        try {
            await this.validateInput(input);
            
            // Fetch required data
            const householdData = await this.getHouseholdData(input.householdId);
            const recipeData = await this.getAvailableRecipes();
            
            // Extract preferences and restrictions
            const preferencesData = {
                dietaryRestrictions: householdData.members.flatMap(m => m.dietaryRestrictions),
                preferences: householdData.members.flatMap(m => m.preferences),
                mealPreferences: {
                    breakfast: { time: '7:00 AM', duration: 30 },
                    lunch: { time: '12:00 PM', duration: 45 },
                    dinner: { time: '6:00 PM', duration: 60 }
                }
            };
            
            // Generate meal plan using LangChain
            const result = await super.execute({
                householdData: JSON.stringify(householdData, null, 2),
                recipeData: JSON.stringify(recipeData, null, 2),
                preferencesData: JSON.stringify(preferencesData, null, 2)
            });
            
            // Parse and validate the generated meal plan
            const mealPlanData = JSON.parse(result.text);
            
            // Create meal plan in database
            const mealPlan = await this.mealPlanService.createMealPlan({
                householdId: input.householdId,
                startDate: input.startDate,
                duration: input.duration,
                meals: mealPlanData.meals,
                totalNutrition: mealPlanData.totalNutrition,
                varietyScore: mealPlanData.varietyScore,
                dietaryCompliance: mealPlanData.dietaryCompliance,
                shoppingList: mealPlanData.shoppingList,
                notes: mealPlanData.notes
            });
            
            return {
                success: true,
                mealPlan,
                householdId: input.householdId
            };
        } catch (error) {
            return await this.handleError(error);
        }
    }

    async handleError(error) {
        this.logger.error('Meal plan generation workflow error:', error);
        return {
            success: false,
            error: error.message,
            householdId: error.householdId
        };
    }
}

module.exports = MealPlanGenerationWorkflow; 