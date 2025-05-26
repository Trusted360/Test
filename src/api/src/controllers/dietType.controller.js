const { DietTypeService } = require('../services');
const logger = require('../utils/logger');

/**
 * DietType controller
 */
class DietTypeController {
  /**
   * Get all diet types
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getAllDietTypes(req, res, next) {
    try {
      const tenantId = req.user.tenantId;
      
      const dietTypes = await DietTypeService.getAllDietTypes(tenantId);
      
      res.json(dietTypes);
    } catch (error) {
      logger.error('Error in getAllDietTypes controller:', error);
      next(error);
    }
  }

  /**
   * Get a diet type by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getDietType(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const dietType = await DietTypeService.getDietType(id, tenantId);
      
      res.json(dietType);
    } catch (error) {
      logger.error(`Error in getDietType controller for ID ${req.params.id}:`, error);
      
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
   * Create a new diet type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async createDietType(req, res, next) {
    try {
      const { name, description, restrictions } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!name) {
        return res.status(400).json({
          error: {
            message: 'Name is required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const dietTypeData = {
        name,
        description,
        restrictions
      };
      
      const dietType = await DietTypeService.createDietType(dietTypeData, tenantId);
      
      res.status(201).json(dietType);
    } catch (error) {
      logger.error('Error in createDietType controller:', error);
      next(error);
    }
  }

  /**
   * Update a diet type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateDietType(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, restrictions } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!name && !description && !restrictions) {
        return res.status(400).json({
          error: {
            message: 'No update parameters provided',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const dietTypeData = {};
      if (name) dietTypeData.name = name;
      if (description !== undefined) dietTypeData.description = description;
      if (restrictions !== undefined) dietTypeData.restrictions = restrictions;
      
      const dietType = await DietTypeService.updateDietType(id, dietTypeData, tenantId);
      
      res.json(dietType);
    } catch (error) {
      logger.error(`Error in updateDietType controller for ID ${req.params.id}:`, error);
      
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
   * Delete a diet type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async deleteDietType(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      await DietTypeService.deleteDietType(id, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in deleteDietType controller for ID ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      if (error.message.includes('Cannot delete system diet types')) {
        return res.status(403).json({
          error: {
            message: error.message,
            code: 'FORBIDDEN'
          }
        });
      }
      
      next(error);
    }
  }
}

module.exports = DietTypeController;
