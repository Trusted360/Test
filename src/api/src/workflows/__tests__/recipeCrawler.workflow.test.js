const RecipeCrawlerWorkflow = require('../recipeCrawler.workflow');
const axios = require('axios');
const { RecipeService } = require('../../services/recipe.service');

// Mock dependencies
jest.mock('axios');
jest.mock('../../services/recipe.service');

describe('RecipeCrawlerWorkflow', () => {
    let workflow;
    const mockConfig = {
        ollamaUrl: 'http://ollama:11434',
        model: 'llama3',
    };

    beforeEach(() => {
        workflow = new RecipeCrawlerWorkflow(mockConfig);
        jest.clearAllMocks();
    });

    describe('validateInput', () => {
        it('should throw error when URL is missing', async () => {
            await expect(workflow.validateInput({}))
                .rejects
                .toThrow('URL is required');
        });

        it('should return input when URL is provided', async () => {
            const input = { url: 'https://example.com/recipe' };
            const result = await workflow.validateInput(input);
            expect(result).toEqual(input);
        });
    });

    describe('fetchHtml', () => {
        it('should fetch HTML content from URL', async () => {
            const mockHtml = '<html><body>Test Recipe</body></html>';
            axios.get.mockResolvedValueOnce({ data: mockHtml });

            const result = await workflow.fetchHtml('https://example.com/recipe');
            expect(result).toBe(mockHtml);
            expect(axios.get).toHaveBeenCalledWith(
                'https://example.com/recipe',
                expect.any(Object)
            );
        });

        it('should handle fetch errors', async () => {
            const error = new Error('Network error');
            axios.get.mockRejectedValueOnce(error);

            await expect(workflow.fetchHtml('https://example.com/recipe'))
                .rejects
                .toThrow('Network error');
        });
    });

    describe('extractMainContent', () => {
        it('should extract main content from HTML', async () => {
            const html = `
                <html>
                    <body>
                        <header>Header</header>
                        <article>
                            <h1>Recipe Title</h1>
                            <p>Recipe content</p>
                        </article>
                        <footer>Footer</footer>
                    </body>
                </html>
            `;

            const result = await workflow.extractMainContent(html);
            expect(result).toContain('Recipe Title');
            expect(result).toContain('Recipe content');
            expect(result).not.toContain('Header');
            expect(result).not.toContain('Footer');
        });
    });

    describe('execute', () => {
        const mockRecipeData = {
            title: 'Test Recipe',
            description: 'A test recipe',
            ingredients: [
                { name: 'Ingredient 1', quantity: 1, unit: 'cup' }
            ],
            instructions: ['Step 1', 'Step 2'],
            prepTime: 10,
            cookTime: 20,
            servings: 4,
            tags: ['test', 'quick'],
            nutritionInfo: {
                calories: 200,
                protein: 10
            }
        };

        beforeEach(() => {
            // Mock HTML fetch
            axios.get.mockResolvedValueOnce({
                data: '<html><body>Test Recipe</body></html>'
            });

            // Mock LangChain chain execution
            workflow.chain = {
                call: jest.fn().mockResolvedValueOnce({
                    text: JSON.stringify(mockRecipeData)
                })
            };

            // Mock recipe service
            RecipeService.prototype.createRecipe = jest.fn()
                .mockResolvedValueOnce({ id: 1, ...mockRecipeData });
        });

        it('should successfully crawl and save recipe', async () => {
            const result = await workflow.execute({
                url: 'https://example.com/recipe'
            });

            expect(result.success).toBe(true);
            expect(result.recipe).toEqual(expect.objectContaining(mockRecipeData));
            expect(result.sourceUrl).toBe('https://example.com/recipe');
        });

        it('should handle errors during execution', async () => {
            const error = new Error('Test error');
            workflow.chain.call.mockRejectedValueOnce(error);

            const result = await workflow.execute({
                url: 'https://example.com/recipe'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Test error');
        });
    });
}); 