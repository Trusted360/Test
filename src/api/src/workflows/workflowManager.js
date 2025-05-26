const cron = require('node-cron');
const { RecipeCrawlerWorkflow } = require('./recipeCrawler.workflow');
const { RecipeEnrichmentWorkflow } = require('./recipeEnrichment.workflow');
const { MealPlanGenerationWorkflow } = require('./mealPlanGeneration.workflow');
const { PreferenceAnalysisWorkflow } = require('./preferenceAnalysis.workflow');
const logger = require('../utils/logger');

class WorkflowManager {
    constructor(config = {}) {
        this.config = config;
        this.logger = logger;
        this.workflows = new Map();
        this.scheduledJobs = new Map();
    }

    async initialize() {
        try {
            // Initialize workflows
            this.workflows.set('recipeCrawler', new RecipeCrawlerWorkflow(this.config));
            this.workflows.set('recipeEnrichment', new RecipeEnrichmentWorkflow(this.config));
            this.workflows.set('mealPlanGeneration', new MealPlanGenerationWorkflow(this.config));
            this.workflows.set('preferenceAnalysis', new PreferenceAnalysisWorkflow(this.config));

            // Initialize scheduled jobs
            await this.initializeScheduledJobs();

            this.logger.info('Workflow manager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize workflow manager:', error);
            throw error;
        }
    }

    async initializeScheduledJobs() {
        // Schedule recipe crawler to run weekly
        this.scheduledJobs.set('recipeCrawler', cron.schedule('0 0 * * 0', async () => {
            try {
                this.logger.info('Starting scheduled recipe crawler workflow');
                const urls = await this.getRecipeSourceUrls();
                for (const url of urls) {
                    await this.executeWorkflow('recipeCrawler', { url });
                }
                this.logger.info('Completed scheduled recipe crawler workflow');
            } catch (error) {
                this.logger.error('Error in scheduled recipe crawler workflow:', error);
            }
        }));

        // Schedule recipe enrichment to run daily
        this.scheduledJobs.set('recipeEnrichment', cron.schedule('0 0 * * *', async () => {
            try {
                this.logger.info('Starting scheduled recipe enrichment workflow');
                const recipes = await this.getUnenrichedRecipes();
                for (const recipe of recipes) {
                    await this.executeWorkflow('recipeEnrichment', { recipeId: recipe.id });
                }
            } catch (error) {
                this.logger.error('Error in scheduled recipe enrichment:', error);
            }
        }));

        // Schedule meal plan generation to run weekly
        this.scheduledJobs.set('mealPlanGeneration', cron.schedule('0 0 * * 0', async () => {
            try {
                this.logger.info('Starting scheduled meal plan generation workflow');
                const households = await this.getActiveHouseholds();
                for (const household of households) {
                    await this.executeWorkflow('mealPlanGeneration', {
                        householdId: household.id,
                        startDate: this.getNextWeekStartDate(),
                        duration: 7
                    });
                }
            } catch (error) {
                this.logger.error('Error in scheduled meal plan generation:', error);
            }
        }));

        // Schedule preference analysis to run monthly
        this.scheduledJobs.set('preferenceAnalysis', cron.schedule('0 0 1 * *', async () => {
            try {
                this.logger.info('Starting scheduled preference analysis workflow');
                const households = await this.getActiveHouseholds();
                for (const household of households) {
                    await this.executeWorkflow('preferenceAnalysis', { householdId: household.id });
                }
                this.logger.info('Completed scheduled preference analysis workflow');
            } catch (error) {
                this.logger.error('Error in scheduled preference analysis workflow:', error);
            }
        }));
    }

    async getRecipeSourceUrls() {
        // TODO: Implement fetching from database or configuration
        return [
            'https://www.allrecipes.com/recipes/',
            'https://www.foodnetwork.com/recipes/',
            'https://www.epicurious.com/recipes-menus'
        ];
    }

    async getUnenrichedRecipes() {
        // TODO: Implement fetching from database
        return [];
    }

    async getActiveHouseholds() {
        // TODO: Implement fetching from database
        return [
            { id: '1', name: 'Household 1' },
            { id: '2', name: 'Household 2' }
        ];
    }

    getNextWeekStartDate() {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + (7 - today.getDay()));
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek.toISOString().split('T')[0];
    }

    async executeWorkflow(workflowName, input) {
        try {
            const workflow = this.workflows.get(workflowName);
            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowName}`);
            }

            this.logger.info(`Executing workflow: ${workflowName}`, { input });
            const result = await workflow.execute(input);
            this.logger.info(`Workflow execution completed: ${workflowName}`, { result });
            return result;
        } catch (error) {
            this.logger.error(`Error executing workflow ${workflowName}:`, error);
            throw error;
        }
    }

    stopWorkflow(workflowName) {
        const job = this.scheduledJobs.get(workflowName);
        if (job) {
            job.stop();
            this.scheduledJobs.delete(workflowName);
            this.logger.info(`Stopped workflow: ${workflowName}`);
        }
    }

    stopAllWorkflows() {
        for (const [name, job] of this.scheduledJobs) {
            job.stop();
            this.logger.info(`Stopped workflow: ${name}`);
        }
        this.scheduledJobs.clear();
    }
}

module.exports = WorkflowManager; 