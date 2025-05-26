const { BaseChain } = require('@langchain/core/chains');
const { logger } = require('../utils/logger');

class BaseWorkflow {
    constructor(config = {}) {
        this.config = config;
        this.logger = logger;
        this.chain = null;
    }

    async initialize() {
        throw new Error('initialize() must be implemented by subclass');
    }

    async execute(input) {
        try {
            if (!this.chain) {
                await this.initialize();
            }
            
            this.logger.info(`Starting workflow execution: ${this.constructor.name}`);
            const result = await this.chain.call(input);
            this.logger.info(`Completed workflow execution: ${this.constructor.name}`);
            
            return result;
        } catch (error) {
            this.logger.error(`Workflow execution failed: ${this.constructor.name}`, error);
            throw error;
        }
    }

    async validateInput(input) {
        throw new Error('validateInput() must be implemented by subclass');
    }

    async handleError(error) {
        this.logger.error(`Workflow error: ${this.constructor.name}`, error);
        throw error;
    }
}

module.exports = BaseWorkflow; 