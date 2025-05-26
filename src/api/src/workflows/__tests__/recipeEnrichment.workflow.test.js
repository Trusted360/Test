const RecipeEnrichmentWorkflow = require('../recipeEnrichment.workflow');
const { RecipeService } = require('../../services/recipe.service');
const { LLMChain } = require('@langchain/core/chains');
const { PromptTemplate } = require('@langchain/core/prompts');
const { Ollama } = require('@langchain/community/llms/ollama');

// Mock dependencies
jest.mock('../../services/recipe.service');
jest.mock('@langchain/core/chains', () => ({
  LLMChain: jest.fn().mockImplementation(() => ({
    call: jest.fn().mockResolvedValue({ text: '{}' }) // Default empty response
  }))
}));
jest.mock('@langchain/core/prompts', () => ({
  PromptTemplate: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('@langchain/community/llms/ollama', () => ({
  Ollama: jest.fn().mockImplementation(() => ({}))
}));

describe('RecipeEnrichmentWorkflow', () => {
    let workflow;
    const mockConfig = {
        ollamaUrl: 'http://ollama:11434',
        model: 'llama3',
    };

    const mockRecipe = {
        id: '123',
        title: 'Test Recipe',
        description: 'A test recipe',
        ingredients: [
            { name: 'Ingredient 1', quantity: 1, unit: 'cup', notes: 'chopped' }
        ],
        instructions: ['Step 1', 'Step 2'],
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        tags: ['test', 'quick']
    };

    const mockEnrichedData = {
        difficulty: 'intermediate',
        cookingTips: ['Tip 1', 'Tip 2'],
        ingredientSubstitutions: [
            { original: 'Ingredient 1', substitute: 'Substitute 1' }
        ],
        dietaryClassifications: ['vegetarian'],
        nutritionInfo: {
            calories: 200,
            protein: 10,
            carbs: 20,
            fat: 5
        },
        flavorProfile: {
            sweet: 2,
            savory: 4,
            spicy: 1
        },
        equipmentNeeded: ['pan', 'spatula'],
        timeEstimates: {
            prep: 15,
            cook: 25,
            total: 40
        },
        servingSuggestions: ['Serve hot', 'Garnish with herbs'],
        storageInstructions: {
            refrigerator: '3 days',
            freezer: '1 month',
            reheating: 'Microwave 2 minutes'
        }
    };

    beforeEach(() => {
        workflow = new RecipeEnrichmentWorkflow(mockConfig);
        jest.clearAllMocks();

        // Mock recipe service
        RecipeService.prototype.getRecipeById = jest.fn()
            .mockResolvedValue(mockRecipe);
        RecipeService.prototype.updateRecipe = jest.fn()
            .mockResolvedValue({ ...mockRecipe, ...mockEnrichedData });

        // Mock LangChain chain execution
        workflow.chain = {
            call: jest.fn().mockResolvedValueOnce({
                text: JSON.stringify(mockEnrichedData)
            })
        };
    });

    describe('validateInput', () => {
        it('should throw error when recipeId is missing', async () => {
            await expect(workflow.validateInput({}))
                .rejects
                .toThrow('Recipe ID is required');
        });

        it('should return input when recipeId is provided', async () => {
            const input = { recipeId: '123' };
            const result = await workflow.validateInput(input);
            expect(result).toEqual(input);
        });
    });

    describe('getRecipeData', () => {
        it('should fetch recipe data', async () => {
            const result = await workflow.getRecipeData('123');
            expect(result).toEqual(mockRecipe);
            expect(RecipeService.prototype.getRecipeById)
                .toHaveBeenCalledWith('123');
        });

        it('should handle recipe not found', async () => {
            RecipeService.prototype.getRecipeById.mockResolvedValueOnce(null);
            await expect(workflow.getRecipeData('123'))
                .rejects
                .toThrow('Recipe not found: 123');
        });
    });

    describe('formatRecipeForEnrichment', () => {
        it('should format recipe data correctly', async () => {
            const result = await workflow.formatRecipeForEnrichment(mockRecipe);
            expect(result).toEqual({
                title: mockRecipe.title,
                description: mockRecipe.description,
                ingredients: mockRecipe.ingredients,
                instructions: mockRecipe.instructions,
                prepTime: mockRecipe.prepTime,
                cookTime: mockRecipe.cookTime,
                servings: mockRecipe.servings,
                tags: mockRecipe.tags
            });
        });
    });

    describe('execute', () => {
        it('should successfully enrich recipe', async () => {
            const result = await workflow.execute({
                recipeId: '123'
            });

            expect(result.success).toBe(true);
            expect(result.recipe).toEqual(expect.objectContaining(mockEnrichedData));
            expect(result.recipeId).toBe('123');
        });

        it('should handle errors during execution', async () => {
            const error = new Error('Test error');
            workflow.chain.call.mockRejectedValueOnce(error);

            const result = await workflow.execute({
                recipeId: '123'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Test error');
        });
    });
}); 