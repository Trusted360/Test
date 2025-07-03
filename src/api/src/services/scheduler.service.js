const logger = require('../utils/logger');

class SchedulerService {
  constructor(knex, checklistService) {
    this.knex = knex;
    this.checklistService = checklistService;
    this.isRunning = false;
    this.intervalId = null;
    this.intervalMinutes = 60; // Run every hour by default
  }

  start(intervalMinutes = 60) {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.intervalMinutes = intervalMinutes;
    this.isRunning = true;

    logger.info(`Starting checklist scheduler (runs every ${intervalMinutes} minutes)`);

    // Run immediately on start
    this.runScheduledTasks().catch(error => {
      logger.error('Error running initial scheduled tasks:', error);
    });

    // Set up recurring execution
    this.intervalId = setInterval(() => {
      this.runScheduledTasks().catch(error => {
        logger.error('Error running scheduled tasks:', error);
      });
    }, intervalMinutes * 60 * 1000);
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    logger.info('Stopping checklist scheduler');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
  }

  async runScheduledTasks() {
    try {
      logger.info('Running scheduled checklist generation');
      
      const now = new Date();
      const result = await this.checklistService.generateScheduledChecklists(now);
      
      if (result.generatedCount > 0) {
        logger.info(`Generated ${result.generatedCount} scheduled checklists`);
      }
      
      if (result.errors.length > 0) {
        logger.warn(`Encountered ${result.errors.length} errors during scheduled generation:`, result.errors);
      }

      // Clean up old generation records (older than 90 days)
      await this.cleanupOldRecords();

      return result;
    } catch (error) {
      logger.error('Error running scheduled tasks:', error);
      throw error;
    }
  }

  async cleanupOldRecords() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

      const deleted = await this.knex('scheduled_checklist_generations')
        .where('created_at', '<', cutoffDate)
        .del();

      if (deleted > 0) {
        logger.info(`Cleaned up ${deleted} old schedule generation records`);
      }
    } catch (error) {
      logger.error('Error cleaning up old records:', error);
    }
  }

  async getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.intervalMinutes,
      lastRun: await this.getLastRunTime(),
      nextRun: this.getNextRunTime()
    };
  }

  async getLastRunTime() {
    try {
      const lastGeneration = await this.knex('scheduled_checklist_generations')
        .orderBy('created_at', 'desc')
        .first();

      return lastGeneration ? lastGeneration.created_at : null;
    } catch (error) {
      logger.error('Error getting last run time:', error);
      return null;
    }
  }

  getNextRunTime() {
    if (!this.isRunning) {
      return null;
    }

    const now = new Date();
    const nextRun = new Date(now.getTime() + (this.intervalMinutes * 60 * 1000));
    return nextRun;
  }

  // Manual trigger for testing
  async triggerGeneration(date = null) {
    logger.info('Manually triggering scheduled checklist generation');
    return await this.runScheduledTasks();
  }
}

module.exports = SchedulerService;