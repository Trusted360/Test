const { MemberService } = require('../services');
const logger = require('../utils/logger');

/**
 * Member controller
 */
class MemberController {
  /**
   * Get a member by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMember(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const member = await MemberService.getMember(id, tenantId);
      
      res.json(member);
    } catch (error) {
      logger.error(`Error in getMember controller for ID ${req.params.id}:`, error);
      
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
   * Update a member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateMember(req, res, next) {
    try {
      const { id } = req.params;
      const { name, dateOfBirth, active } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!name && dateOfBirth === undefined && active === undefined) {
        return res.status(400).json({
          error: {
            message: 'No update parameters provided',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const updateData = {};
      if (name) updateData.name = name;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
      if (active !== undefined) updateData.active = active;
      
      const member = await MemberService.updateMember(id, updateData, tenantId);
      
      res.json(member);
    } catch (error) {
      logger.error(`Error in updateMember controller for ID ${req.params.id}:`, error);
      
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
   * Delete a member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async deleteMember(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      await MemberService.deleteMember(id, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in deleteMember controller for ID ${req.params.id}:`, error);
      
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
   * Get dietary preferences for a member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getDietaryPreferences(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const preferences = await MemberService.getDietaryPreferences(id, tenantId);
      
      res.json(preferences);
    } catch (error) {
      logger.error(`Error in getDietaryPreferences controller for member ID ${req.params.id}:`, error);
      
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
   * Add a dietary preference for a member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async addDietaryPreference(req, res, next) {
    try {
      const { id } = req.params;
      const { dietTypeId, startsOn, endsOn } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!dietTypeId || !startsOn) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: dietTypeId and startsOn are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const preferenceData = {
        dietTypeId,
        startsOn,
        endsOn
      };
      
      const preference = await MemberService.addDietaryPreference(id, preferenceData, tenantId);
      
      res.status(201).json(preference);
    } catch (error) {
      logger.error(`Error in addDietaryPreference controller for member ID ${req.params.id}:`, error);
      
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
   * Remove a dietary preference
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async removeDietaryPreference(req, res, next) {
    try {
      const { id, preferenceId } = req.params;
      const tenantId = req.user.tenantId;
      
      // First check if member exists
      await MemberService.getMember(id, tenantId);
      
      await MemberService.removeDietaryPreference(preferenceId, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in removeDietaryPreference controller for preference ID ${req.params.preferenceId}:`, error);
      
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

module.exports = MemberController;
