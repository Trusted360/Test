const { MealPlanApprovalService } = require('../services');
const logger = require('../utils/logger');

/**
 * MealPlanApproval controller
 */
class MealPlanApprovalController {
  /**
   * Submit a meal plan for approval
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async submitMealPlanForApproval(req, res, next) {
    try {
      const { id } = req.params;
      const memberId = req.user.id;
      const tenantId = req.user.tenantId;
      
      const version = await MealPlanApprovalService.submitMealPlanForApproval(id, memberId, tenantId);
      
      res.status(201).json(version);
    } catch (error) {
      logger.error(`Error in submitMealPlanForApproval controller for meal plan ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      if (error.message.includes('must be in draft status')) {
        return res.status(400).json({
          error: {
            message: error.message,
            code: 'INVALID_STATUS'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Submit an approval response for a meal plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async submitApprovalResponse(req, res, next) {
    try {
      const { id, versionNumber } = req.params;
      const { response, feedback, itemApprovals } = req.body;
      const memberId = req.user.id;
      const tenantId = req.user.tenantId;
      
      if (!response) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: response',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const approvalData = {
        mealPlanId: id,
        memberId,
        versionNumber: parseInt(versionNumber),
        response,
        feedback,
        itemApprovals
      };
      
      const approval = await MealPlanApprovalService.submitApprovalResponse(approvalData, tenantId);
      
      res.status(201).json(approval);
    } catch (error) {
      logger.error(`Error in submitApprovalResponse controller for meal plan ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      if (error.message.includes('Invalid response type')) {
        return res.status(400).json({
          error: {
            message: error.message,
            code: 'INVALID_RESPONSE_TYPE'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Add a comment to a meal plan version
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async addComment(req, res, next) {
    try {
      const { id, versionNumber } = req.params;
      const { comment } = req.body;
      const memberId = req.user.id;
      const tenantId = req.user.tenantId;
      
      if (!comment) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: comment',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const commentData = {
        mealPlanId: id,
        memberId,
        versionNumber: parseInt(versionNumber),
        comment
      };
      
      const createdComment = await MealPlanApprovalService.addComment(commentData, tenantId);
      
      res.status(201).json(createdComment);
    } catch (error) {
      logger.error(`Error in addComment controller for meal plan ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Get approval details for a meal plan version
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getApprovalDetails(req, res, next) {
    try {
      const { id, versionNumber } = req.params;
      const tenantId = req.user.tenantId;
      
      const details = await MealPlanApprovalService.getApprovalDetails(
        id, 
        parseInt(versionNumber), 
        tenantId
      );
      
      res.json(details);
    } catch (error) {
      logger.error(`Error in getApprovalDetails controller for meal plan ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Get all versions of a meal plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMealPlanVersions(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const versions = await MealPlanApprovalService.getMealPlanVersions(id, tenantId);
      
      res.json(versions);
    } catch (error) {
      logger.error(`Error in getMealPlanVersions controller for meal plan ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Revise a meal plan based on feedback
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async reviseMealPlan(req, res, next) {
    try {
      const { id } = req.params;
      const memberId = req.user.id;
      const tenantId = req.user.tenantId;
      
      const mealPlan = await MealPlanApprovalService.reviseMealPlan(id, memberId, tenantId);
      
      res.json(mealPlan);
    } catch (error) {
      logger.error(`Error in reviseMealPlan controller for meal plan ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      if (error.message.includes('cannot be revised')) {
        return res.status(400).json({
          error: {
            message: error.message,
            code: 'INVALID_STATUS'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Finalize an approved meal plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async finalizeMealPlan(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const mealPlan = await MealPlanApprovalService.finalizeMealPlan(id, tenantId);
      
      res.json(mealPlan);
    } catch (error) {
      logger.error(`Error in finalizeMealPlan controller for meal plan ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      if (error.message.includes('must be approved')) {
        return res.status(400).json({
          error: {
            message: error.message,
            code: 'INVALID_STATUS'
          }
        });
      }
      
      next(error);
    }
  }
}

module.exports = MealPlanApprovalController;
