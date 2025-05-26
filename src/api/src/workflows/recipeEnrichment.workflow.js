const BaseWorkflow = require('./base.workflow');
const { LLMChain } = require('@langchain/core/chains');
const { PromptTemplate } = require('@langchain/core/prompts');
const { Ollama } = require('@langchain/community/llms/ollama');
const { RecipeService } = require('../services/recipe.service');
const { logger } = require('../utils/logger');

class RecipeEnrichmentWorkflow extends BaseWorkflow {
    constructor(config = {}) {
        super(config);
        this.recipeService = new RecipeService();
    }

    async initialize() {
        // Initialize Ollama model
        const model = new Ollama({
            baseUrl: this.config.ollamaUrl || 'http://ollama:11434',
            model: this.config.model || 'llama3',
            temperature: 0.2,
        });

        // Create prompt template for recipe enrichment
        const promptTemplate = new PromptTemplate({
            template: `Analyze the following recipe and provide enriched information. Return JSON with these fields:
            - difficulty: Recipe difficulty level (beginner, intermediate, advanced)
            - cookingTips: Array of helpful tips for preparing this recipe
            - ingredientSubstitutions: Array of possible ingredient substitutions
            - dietaryClassifications: Array of dietary classifications (vegetarian, vegan, gluten-free, etc.)
            - nutritionInfo: Detailed nutrition information per serving
            - flavorProfile: Object describing the flavor profile (sweet, savory, spicy, etc.)
            - equipmentNeeded: Array of required cooking equipment
            - timeEstimates: Object with detailed time estimates (prep, cook, total)
            - servingSuggestions: Array of serving suggestions and pairings
            - storageInstructions: Object with storage and reheating instructions

            Recipe:
            {recipeData}
            
            Return ONLY valid JSON without any explanation.`,
            inputVariables: ['recipeData'],
        });

        // Initialize the chain
        this.chain = new LLMChain({
            llm: model,
            prompt: promptTemplate,
        });
    }

    async validateInput(input) {
        if (!input.recipeId) {
            throw new Error('Recipe ID is required');
        }
        return input;
    }

    async getRecipeData(recipeId) {
        try {
            const recipe = await this.recipeService.getRecipeById(recipeId);
            if (!recipe) {
                throw new Error(`Recipe not found: ${recipeId}`);
            }
            return recipe;
        } catch (error) {
            this.logger.error(`Failed to fetch recipe ${recipeId}:`, error);
            throw error;
        }
    }

    async formatRecipeForEnrichment(recipe) {
        return {
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients.map(ing => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
                notes: ing.notes
            })),
            instructions: recipe.instructions,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            servings: recipe.servings,
            tags: recipe.tags
        };
    }

    async execute(input) {
        try {
            await this.validateInput(input);
            
            // Fetch recipe data
            const recipe = await this.getRecipeData(input.recipeId);
            const formattedRecipe = await this.formatRecipeForEnrichment(recipe);
            
            // Extract enriched data using LangChain
            const result = await super.execute({
                recipeData: JSON.stringify(formattedRecipe, null, 2),
            });
            
            // Parse and validate the enriched data
            const enrichedData = JSON.parse(result.text);
            
            // Update recipe with enriched data
            const updatedRecipe = await this.recipeService.updateRecipe(input.recipeId, {
                ...recipe,
                ...enrichedData,
                enrichedAt: new Date().toISOString(),
            });
            
            return {
                success: true,
                recipe: updatedRecipe,
                recipeId: input.recipeId,
            };
        } catch (error) {
            return await this.handleError(error);
        }
    }

    async handleError(error) {
        this.logger.error('Recipe enrichment workflow error:', error);
        return {
            success: false,
            error: error.message,
            recipeId: error.recipeId,
        };
    }
}

module.exports = RecipeEnrichmentWorkflow; 