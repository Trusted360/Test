const MealPlanGenerationWorkflow = require('../mealPlanGeneration.workflow');
const { MealPlanService } = require('../../services/mealPlan.service');
const { RecipeService } = require('../../services/recipe.service');
const { HouseholdService } = require('../../services/household.service');

// Mock dependencies
jest.mock('../../services/mealPlan.service');
jest.mock('../../services/recipe.service');
jest.mock('../../services/household.service');

describe('MealPlanGenerationWorkflow', () => {
    let workflow;
    const mockConfig = {
        ollamaUrl: 'http://ollama:11434',
        model: 'llama3',
    };

    const mockHousehold = {
        id: '123',
        name: 'Test Household',
        members: [
            {
                id: '1',
                name: 'John Doe',
                dietaryRestrictions: ['vegetarian'],
                preferences: ['spicy', 'quick-meals']
            },
            {
                id: '2',
                name: 'Jane Doe',
                dietaryRestrictions: ['gluten-free'],
                preferences: ['healthy', 'low-carb']
            }
        ]
    };

    const mockRecipes = [
        {
            id: 'r1',
            title: 'Vegetarian Pasta',
            description: 'A quick vegetarian pasta dish',
            difficulty: 'easy',
            prepTime: 15,
            cookTime: 20,
            servings: 4,
            tags: ['vegetarian', 'pasta', 'quick'],
            dietaryClassifications: ['vegetarian'],
            nutritionInfo: {
                calories: 400,
                protein: 15,
                carbs: 60,
                fat: 10
            }
        },
        {
            id: 'r2',
            title: 'Gluten-Free Salad',
            description: 'A healthy gluten-free salad',
            difficulty: 'easy',
            prepTime: 10,
            cookTime: 0,
            servings: 2,
            tags: ['gluten-free', 'salad', 'healthy'],
            dietaryClassifications: ['gluten-free', 'vegetarian'],
            nutritionInfo: {
                calories: 200,
                protein: 10,
                carbs: 20,
                fat: 5
            }
        }
    ];

    const mockMealPlan = {
        id: 'mp1',
        householdId: '123',
        startDate: '2024-03-20',
        duration: 7,
        meals: [
            {
                day: 'Monday',
                breakfast: { recipeId: 'r1', notes: 'Add extra vegetables' },
                lunch: { recipeId: 'r2', notes: 'Double the protein' },
                dinner: { recipeId: 'r1', notes: 'Serve with garlic bread' },
                snacks: [
                    { recipeId: 'r2', notes: 'Half portion' }
                ]
            }
        ],
        totalNutrition: {
            calories: 2000,
            protein: 80,
            carbs: 200,
            fat: 50
        },
        varietyScore: 8,
        dietaryCompliance: {
            vegetarian: 100,
            'gluten-free': 90
        },
        shoppingList: [
            { ingredient: 'pasta', quantity: 500, unit: 'g' },
            { ingredient: 'vegetables', quantity: 1, unit: 'kg' }
        ],
        notes: ['Consider meal prep for busy days']
    };

    beforeEach(() => {
        workflow = new MealPlanGenerationWorkflow(mockConfig);
        jest.clearAllMocks();

        // Mock services
        HouseholdService.prototype.getHouseholdById = jest.fn()
            .mockResolvedValue(mockHousehold);
        RecipeService.prototype.getRecipes = jest.fn()
            .mockResolvedValue(mockRecipes);
        MealPlanService.prototype.createMealPlan = jest.fn()
            .mockResolvedValue(mockMealPlan);

        // Mock LangChain chain execution
        workflow.chain = {
            call: jest.fn().mockResolvedValueOnce({
                text: JSON.stringify(mockMealPlan)
            })
        };
    });

    describe('validateInput', () => {
        it('should throw error when householdId is missing', async () => {
            await expect(workflow.validateInput({
                startDate: '2024-03-20',
                duration: 7
            })).rejects.toThrow('Household ID is required');
        });

        it('should throw error when startDate is missing', async () => {
            await expect(workflow.validateInput({
                householdId: '123',
                duration: 7
            })).rejects.toThrow('Start date is required');
        });

        it('should throw error when duration is missing', async () => {
            await expect(workflow.validateInput({
                householdId: '123',
                startDate: '2024-03-20'
            })).rejects.toThrow('Duration is required');
        });

        it('should return input when all required fields are provided', async () => {
            const input = {
                householdId: '123',
                startDate: '2024-03-20',
                duration: 7
            };
            const result = await workflow.validateInput(input);
            expect(result).toEqual(input);
        });
    });

    describe('getHouseholdData', () => {
        it('should fetch household data', async () => {
            const result = await workflow.getHouseholdData('123');
            expect(result).toEqual(mockHousehold);
            expect(HouseholdService.prototype.getHouseholdById)
                .toHaveBeenCalledWith('123');
        });

        it('should handle household not found', async () => {
            HouseholdService.prototype.getHouseholdById.mockResolvedValueOnce(null);
            await expect(workflow.getHouseholdData('123'))
                .rejects
                .toThrow('Household not found: 123');
        });
    });

    describe('getAvailableRecipes', () => {
        it('should fetch available recipes', async () => {
            const result = await workflow.getAvailableRecipes();
            expect(result).toEqual(mockRecipes);
            expect(RecipeService.prototype.getRecipes)
                .toHaveBeenCalledWith({ limit: 100, enriched: true });
        });
    });

    describe('execute', () => {
        it('should successfully generate meal plan', async () => {
            const result = await workflow.execute({
                householdId: '123',
                startDate: '2024-03-20',
                duration: 7
            });

            expect(result.success).toBe(true);
            expect(result.mealPlan).toEqual(mockMealPlan);
            expect(result.householdId).toBe('123');
        });

        it('should handle errors during execution', async () => {
            const error = new Error('Test error');
            workflow.chain.call.mockRejectedValueOnce(error);

            const result = await workflow.execute({
                householdId: '123',
                startDate: '2024-03-20',
                duration: 7
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Test error');
        });
    });
}); 