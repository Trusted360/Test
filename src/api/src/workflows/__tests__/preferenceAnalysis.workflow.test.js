const PreferenceAnalysisWorkflow = require('../preferenceAnalysis.workflow');
const { HouseholdService } = require('../../services/household.service');
const { MealPlanService } = require('../../services/mealPlan.service');
const { RecipeService } = require('../../services/recipe.service');

// Mock dependencies
jest.mock('../../services/household.service');
jest.mock('../../services/mealPlan.service');
jest.mock('../../services/recipe.service');

describe('PreferenceAnalysisWorkflow', () => {
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
                preferences: ['spicy', 'quick-meals'],
                mealPreferences: {
                    breakfast: { time: '7:00 AM', duration: 30 },
                    lunch: { time: '12:00 PM', duration: 45 },
                    dinner: { time: '6:00 PM', duration: 60 }
                }
            },
            {
                id: '2',
                name: 'Jane Doe',
                dietaryRestrictions: ['gluten-free'],
                preferences: ['healthy', 'low-carb'],
                mealPreferences: {
                    breakfast: { time: '7:30 AM', duration: 30 },
                    lunch: { time: '1:00 PM', duration: 45 },
                    dinner: { time: '6:30 PM', duration: 60 }
                }
            }
        ]
    };

    const mockMealHistory = [
        {
            date: '2024-03-19',
            mealType: 'dinner',
            recipeId: 'r1',
            feedback: { rating: 5, comments: 'Great meal!' },
            substitutions: [],
            notes: 'Served with extra vegetables'
        },
        {
            date: '2024-03-18',
            mealType: 'lunch',
            recipeId: 'r2',
            feedback: { rating: 4, comments: 'Good but could be spicier' },
            substitutions: [{ original: 'pasta', substitute: 'gluten-free pasta' }],
            notes: 'Added extra spice'
        }
    ];

    const mockRecipes = [
        {
            id: 'r1',
            title: 'Vegetarian Pasta',
            cuisine: 'Italian',
            ingredients: ['pasta', 'tomatoes', 'basil'],
            tags: ['vegetarian', 'pasta', 'quick'],
            dietaryClassifications: ['vegetarian'],
            nutritionInfo: {
                calories: 400,
                protein: 15,
                carbs: 60,
                fat: 10
            },
            difficulty: 'easy',
            prepTime: 15,
            cookTime: 20
        },
        {
            id: 'r2',
            title: 'Gluten-Free Stir Fry',
            cuisine: 'Asian',
            ingredients: ['rice', 'vegetables', 'tofu'],
            tags: ['gluten-free', 'stir-fry', 'healthy'],
            dietaryClassifications: ['gluten-free', 'vegetarian'],
            nutritionInfo: {
                calories: 350,
                protein: 20,
                carbs: 45,
                fat: 8
            },
            difficulty: 'medium',
            prepTime: 20,
            cookTime: 15
        }
    ];

    const mockAnalysis = {
        preferenceInsights: {
            favoriteCuisines: [
                { cuisine: 'Italian', confidence: 0.8 },
                { cuisine: 'Asian', confidence: 0.6 }
            ],
            favoriteIngredients: [
                { ingredient: 'pasta', confidence: 0.7 },
                { ingredient: 'vegetables', confidence: 0.9 }
            ],
            mealTimePreferences: {
                breakfast: { preferredTime: '7:15 AM', duration: 30 },
                lunch: { preferredTime: '12:30 PM', duration: 45 },
                dinner: { preferredTime: '6:15 PM', duration: 60 }
            },
            dietaryPatterns: {
                vegetarian: 100,
                'gluten-free': 90
            },
            cookingStylePreferences: ['quick', 'healthy']
        },
        conflictAnalysis: {
            memberConflicts: [
                {
                    members: ['John Doe', 'Jane Doe'],
                    conflict: 'Spice level preference',
                    severity: 'low'
                }
            ],
            resolutionSuggestions: [
                'Serve spicy condiments on the side',
                'Prepare base dish mild and add spice to individual portions'
            ]
        },
        nutritionalInsights: {
            nutritionalGaps: [
                'Low in omega-3 fatty acids',
                'Could use more leafy greens'
            ],
            improvementSuggestions: [
                'Add fish or flax seeds to increase omega-3',
                'Include more salads and green vegetables'
            ]
        },
        mealPlanningInsights: {
            varietyScore: 7,
            repetitionPatterns: [
                'Pasta dishes appear frequently',
                'Limited variety in protein sources'
            ],
            improvementAreas: [
                'Increase variety of cuisines',
                'Include more seafood options'
            ]
        },
        recommendations: [
            'Try Mediterranean recipes for more variety',
            'Include more seafood dishes',
            'Add more leafy green vegetables'
        ]
    };

    beforeEach(() => {
        workflow = new PreferenceAnalysisWorkflow(mockConfig);
        jest.clearAllMocks();

        // Mock services
        HouseholdService.prototype.getHouseholdById = jest.fn()
            .mockResolvedValue(mockHousehold);
        HouseholdService.prototype.updateHouseholdPreferences = jest.fn()
            .mockResolvedValue({ ...mockHousehold, preferenceInsights: mockAnalysis.preferenceInsights });
        MealPlanService.prototype.getMealHistory = jest.fn()
            .mockResolvedValue(mockMealHistory);
        RecipeService.prototype.getRecipesByIds = jest.fn()
            .mockResolvedValue(mockRecipes);

        // Mock LangChain chain execution
        workflow.chain = {
            call: jest.fn().mockResolvedValueOnce({
                text: JSON.stringify(mockAnalysis)
            })
        };
    });

    describe('validateInput', () => {
        it('should throw error when householdId is missing', async () => {
            await expect(workflow.validateInput({}))
                .rejects
                .toThrow('Household ID is required');
        });

        it('should return input when householdId is provided', async () => {
            const input = { householdId: '123' };
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

    describe('getMealHistory', () => {
        it('should fetch meal history', async () => {
            const result = await workflow.getMealHistory('123');
            expect(result).toEqual(mockMealHistory);
            expect(MealPlanService.prototype.getMealHistory)
                .toHaveBeenCalledWith('123', { limit: 30, includeFeedback: true });
        });
    });

    describe('getRecipeData', () => {
        it('should fetch recipe data', async () => {
            const recipeIds = ['r1', 'r2'];
            const result = await workflow.getRecipeData(recipeIds);
            expect(result).toEqual(mockRecipes);
            expect(RecipeService.prototype.getRecipesByIds)
                .toHaveBeenCalledWith(recipeIds);
        });
    });

    describe('execute', () => {
        it('should successfully analyze preferences', async () => {
            const result = await workflow.execute({
                householdId: '123'
            });

            expect(result.success).toBe(true);
            expect(result.analysis).toEqual(mockAnalysis);
            expect(result.householdId).toBe('123');
            expect(HouseholdService.prototype.updateHouseholdPreferences)
                .toHaveBeenCalledWith('123', {
                    preferenceInsights: mockAnalysis.preferenceInsights,
                    lastAnalysisDate: expect.any(String)
                });
        });

        it('should handle errors during execution', async () => {
            const error = new Error('Test error');
            workflow.chain.call.mockRejectedValueOnce(error);

            const result = await workflow.execute({
                householdId: '123'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Test error');
        });
    });
}); 