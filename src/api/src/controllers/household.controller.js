const { HouseholdService } = require('../services');
const logger = require('../utils/logger');

/**
 * Household controller
 */
class HouseholdController {
  /**
   * Create a new household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async createHousehold(req, res, next) {
    try {
      const { name } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!name) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: name',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const household = await HouseholdService.createHousehold({ name }, tenantId);
      
      res.status(201).json(household);
    } catch (error) {
      logger.error('Error in createHousehold controller:', error);
      next(error);
    }
  }

  /**
   * Get a household by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getHousehold(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const household = await HouseholdService.getHousehold(id, tenantId);
      
      res.json(household);
    } catch (error) {
      logger.error(`Error in getHousehold controller for ID ${req.params.id}:`, error);
      
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
   * Get all households
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getAllHouseholds(req, res, next) {
    try {
      const tenantId = req.user.tenantId;
      
      const households = await HouseholdService.getAllHouseholds(tenantId);
      
      res.json(households);
    } catch (error) {
      logger.error('Error in getAllHouseholds controller:', error);
      next(error);
    }
  }

  /**
   * Update a household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateHousehold(req, res, next) {
    try {
      const { id } = req.params;
      const { name, preferences } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!name && !preferences) {
        return res.status(400).json({
          error: {
            message: 'No update parameters provided',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const updateData = {};
      if (name) updateData.name = name;
      if (preferences) updateData.preferences = preferences;
      
      const household = await HouseholdService.updateHousehold(id, updateData, tenantId);
      
      res.json(household);
    } catch (error) {
      logger.error(`Error in updateHousehold controller for ID ${req.params.id}:`, error);
      
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
   * Delete a household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async deleteHousehold(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      await HouseholdService.deleteHousehold(id, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in deleteHousehold controller for ID ${req.params.id}:`, error);
      
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
   * Get members of a household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getHouseholdMembers(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const members = await HouseholdService.getHouseholdMembers(id, tenantId);
      
      res.json(members);
    } catch (error) {
      logger.error(`Error in getHouseholdMembers controller for household ID ${req.params.id}:`, error);
      
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
   * Add a member to a household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async addMember(req, res, next) {
    try {
      const { id } = req.params;
      const { name, dateOfBirth, active } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!name) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: name',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const memberData = {
        name,
        dateOfBirth,
        active
      };
      
      const member = await HouseholdService.addMember(id, memberData, tenantId);
      
      res.status(201).json(member);
    } catch (error) {
      logger.error(`Error in addMember controller for household ID ${req.params.id}:`, error);
      
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
   * Get meal plans for a household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getHouseholdMealPlans(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const mealPlans = await HouseholdService.getHouseholdMealPlans(id, tenantId);
      
      res.json(mealPlans);
    } catch (error) {
      logger.error(`Error in getHouseholdMealPlans controller for household ID ${req.params.id}:`, error);
      
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
   * Get shopping lists for a household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getHouseholdShoppingLists(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const shoppingLists = await HouseholdService.getHouseholdShoppingLists(id, tenantId);
      
      res.json(shoppingLists);
    } catch (error) {
      logger.error(`Error in getHouseholdShoppingLists controller for household ID ${req.params.id}:`, error);
      
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
}

module.exports = HouseholdController;
