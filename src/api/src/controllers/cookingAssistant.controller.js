const { CookingAssistantService } = require('../services');
const logger = require('../utils/logger');

/**
 * CookingAssistant controller
 * Handles cooking assistant API endpoints
 */
class CookingAssistantController {
  /**
   * Start a cooking session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async startSession(req, res, next) {
    try {
      const { memberId, recipeId } = req.body;
      
      if (!memberId || !recipeId) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: memberId and recipeId are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const session = await CookingAssistantService.startSession({ memberId, recipeId }, tenantId);
      
      res.status(201).json(session);
    } catch (error) {
      logger.error('Error starting cooking session:', error);
      next(error);
    }
  }
  
  /**
   * Send a message to the cooking assistant
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async sendMessage(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: message is required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const response = await CookingAssistantService.sendMessage(sessionId, message, tenantId);
      
      res.json(response);
    } catch (error) {
      logger.error(`Error sending message to cooking assistant:`, error);
      next(error);
    }
  }
  
  /**
   * Get next step in the recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getNextStep(req, res, next) {
    try {
      const { sessionId } = req.params;
      const tenantId = req.tenantId;
      
      const nextStep = await CookingAssistantService.getNextStep(sessionId, tenantId);
      
      res.json(nextStep);
    } catch (error) {
      logger.error(`Error getting next step:`, error);
      next(error);
    }
  }
  
  /**
   * Get previous step in the recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getPreviousStep(req, res, next) {
    try {
      const { sessionId } = req.params;
      const tenantId = req.tenantId;
      
      const previousStep = await CookingAssistantService.getPreviousStep(sessionId, tenantId);
      
      res.json(previousStep);
    } catch (error) {
      logger.error(`Error getting previous step:`, error);
      next(error);
    }
  }
  
  /**
   * Get ingredient substitutions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getIngredientSubstitutions(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { ingredient } = req.body;
      
      if (!ingredient) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: ingredient is required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const tenantId = req.tenantId;
      const substitutions = await CookingAssistantService.getIngredientSubstitutions(sessionId, ingredient, tenantId);
      
      res.json(substitutions);
    } catch (error) {
      logger.error(`Error getting ingredient substitutions:`, error);
      next(error);
    }
  }
  
  /**
   * End cooking session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async endSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { rating, feedback } = req.body;
      const tenantId = req.tenantId;
      
      const sessionSummary = await CookingAssistantService.endSession(sessionId, { rating, feedback }, tenantId);
      
      res.json(sessionSummary);
    } catch (error) {
      logger.error(`Error ending cooking session:`, error);
      next(error);
    }
  }
  
  /**
   * Get active cooking sessions for a member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getActiveSessions(req, res, next) {
    try {
      const { memberId } = req.params;
      const tenantId = req.tenantId;
      
      const activeSessions = await CookingAssistantService.getActiveSessions(memberId, tenantId);
      
      res.json(activeSessions);
    } catch (error) {
      logger.error(`Error getting active cooking sessions:`, error);
      next(error);
    }
  }
}

module.exports = CookingAssistantController;
