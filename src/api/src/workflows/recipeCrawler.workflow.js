const BaseWorkflow = require('./base.workflow');
const { LLMChain } = require('@langchain/core/chains');
const { PromptTemplate } = require('@langchain/core/prompts');
const { Ollama } = require('@langchain/community/llms/ollama');
const axios = require('axios');
const cheerio = require('cheerio');
const { RecipeService } = require('../services/recipe.service');
const { logger } = require('../utils/logger');

class RecipeCrawlerWorkflow extends BaseWorkflow {
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

        // Create prompt template for recipe extraction
        const promptTemplate = new PromptTemplate({
            template: `Extract structured recipe data from the following webpage content. Return JSON with these fields:
            - title: The recipe title
            - description: Brief description of the recipe
            - ingredients: Array of {name, quantity, unit, notes}
            - instructions: Array of steps
            - prepTime: Preparation time in minutes
            - cookTime: Cooking time in minutes
            - servings: Number of servings
            - tags: Array of tags (cuisine type, meal type, etc.)
            - nutritionInfo: Object with nutrition values if available

            HTML Content:
            {htmlContent}
            
            Source URL: {url}
            
            Return ONLY valid JSON without any explanation.`,
            inputVariables: ['htmlContent', 'url'],
        });

        // Initialize the chain
        this.chain = new LLMChain({
            llm: model,
            prompt: promptTemplate,
        });
    }

    async validateInput(input) {
        if (!input.url) {
            throw new Error('URL is required');
        }
        return input;
    }

    async fetchHtml(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SimmerBot/1.0; +http://simmer.app)',
                },
                timeout: 10000,
            });
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to fetch HTML from ${url}:`, error);
            throw error;
        }
    }

    async extractMainContent(html) {
        const $ = cheerio.load(html);
        
        // Remove unwanted elements
        $('script, style, nav, footer, header, aside').remove();
        
        // Try to find the main content area
        const mainContent = $('article, main, [role="main"], .recipe, .content, #content')
            .first()
            .html() || $('body').html();
            
        return mainContent;
    }

    async execute(input) {
        try {
            await this.validateInput(input);
            
            // Fetch and parse HTML
            const html = await this.fetchHtml(input.url);
            const mainContent = await this.extractMainContent(html);
            
            // Extract recipe data using LangChain
            const result = await super.execute({
                htmlContent: mainContent,
                url: input.url,
            });
            
            // Parse and validate the extracted data
            const recipeData = JSON.parse(result.text);
            
            // Add metadata
            recipeData.sourceUrl = input.url;
            recipeData.extractedAt = new Date().toISOString();
            
            // Save to database
            const savedRecipe = await this.recipeService.createRecipe(recipeData);
            
            return {
                success: true,
                recipe: savedRecipe,
                sourceUrl: input.url,
            };
        } catch (error) {
            return await this.handleError(error);
        }
    }

    async handleError(error) {
        this.logger.error('Recipe crawler workflow error:', error);
        return {
            success: false,
            error: error.message,
            sourceUrl: error.url,
        };
    }
}

module.exports = RecipeCrawlerWorkflow; 