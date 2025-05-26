const { DietaryPreferenceService } = require('../services');
const logger = require('../utils/logger');

/**
 * DietaryPreference controller
 */
class DietaryPreferenceController {
  /**
   * Get a member's complete dietary profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMemberDietaryProfile(req, res, next) {
    try {
      const { memberId } = req.params;
      const tenantId = req.user.tenantId;
      
      const profile = await DietaryPreferenceService.getMemberDietaryProfile(memberId, tenantId);
      
      res.json(profile);
    } catch (error) {
      logger.error(`Error in getMemberDietaryProfile controller for member ID ${req.params.memberId}:`, error);
      
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
   * Get all food allergies for a member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMemberAllergies(req, res, next) {
    try {
      const { memberId } = req.params;
      const tenantId = req.user.tenantId;
      
      const allergies = await DietaryPreferenceService.getMemberAllergies(memberId, tenantId);
      
      res.json(allergies);
    } catch (error) {
      logger.error(`Error in getMemberAllergies controller for member ID ${req.params.memberId}:`, error);
      
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
   * Add a food allergy for a member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async addMemberAllergy(req, res, next) {
    try {
      const { memberId } = req.params;
      const { ingredientId, severity, notes } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!ingredientId || !severity) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: ingredientId and severity are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const allergyData = {
        ingredientId,
        severity,
        notes
      };
      
      const allergy = await DietaryPreferenceService.addMemberAllergy(memberId, allergyData, tenantId);
      
      res.status(201).json(allergy);
    } catch (error) {
      logger.error(`Error in addMemberAllergy controller for member ID ${req.params.memberId}:`, error);
      
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
   * Update a food allergy
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateMemberAllergy(req, res, next) {
    try {
      const { memberId, allergyId } = req.params;
      const { severity, notes } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!severity && notes === undefined) {
        return res.status(400).json({
          error: {
            message: 'No update parameters provided',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const allergyData = {};
      if (severity) allergyData.severity = severity;
      if (notes !== undefined) allergyData.notes = notes;
      
      const allergy = await DietaryPreferenceService.updateMemberAllergy(allergyId, allergyData, tenantId);
      
      res.json(allergy);
    } catch (error) {
      logger.error(`Error in updateMemberAllergy controller for allergy ID ${req.params.allergyId}:`, error);
      
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
   * Remove a food allergy
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async removeMemberAllergy(req, res, next) {
    try {
      const { memberId, allergyId } = req.params;
      const tenantId = req.user.tenantId;
      
      await DietaryPreferenceService.removeMemberAllergy(allergyId, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in removeMemberAllergy controller for allergy ID ${req.params.allergyId}:`, error);
      
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
   * Get all food preferences for a member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMemberPreferences(req, res, next) {
    try {
      const { memberId } = req.params;
      const tenantId = req.user.tenantId;
      
      const preferences = await DietaryPreferenceService.getMemberPreferences(memberId, tenantId);
      
      res.json(preferences);
    } catch (error) {
      logger.error(`Error in getMemberPreferences controller for member ID ${req.params.memberId}:`, error);
      
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
   * Set a food preference for a member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async setMemberPreference(req, res, next) {
    try {
      const { memberId } = req.params;
      const { ingredientId, preferenceLevel, notes } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!ingredientId || preferenceLevel === undefined) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: ingredientId and preferenceLevel are required',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      // Validate preference level
      if (preferenceLevel < -3 || preferenceLevel > 3) {
        return res.status(400).json({
          error: {
            message: 'Preference level must be between -3 and 3',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const preferenceData = {
        ingredientId,
        preferenceLevel,
        notes
      };
      
      const preference = await DietaryPreferenceService.setMemberPreference(memberId, preferenceData, tenantId);
      
      res.status(201).json(preference);
    } catch (error) {
      logger.error(`Error in setMemberPreference controller for member ID ${req.params.memberId}:`, error);
      
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
   * Remove a food preference
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async removeMemberPreference(req, res, next) {
    try {
      const { memberId, preferenceId } = req.params;
      const tenantId = req.user.tenantId;
      
      await DietaryPreferenceService.removeMemberPreference(preferenceId, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in removeMemberPreference controller for preference ID ${req.params.preferenceId}:`, error);
      
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
   * Get liked and disliked ingredients for a member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMemberLikesAndDislikes(req, res, next) {
    try {
      const { memberId } = req.params;
      const tenantId = req.user.tenantId;
      
      const likesAndDislikes = await DietaryPreferenceService.getMemberLikesAndDislikes(memberId, tenantId);
      
      res.json(likesAndDislikes);
    } catch (error) {
      logger.error(`Error in getMemberLikesAndDislikes controller for member ID ${req.params.memberId}:`, error);
      
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

module.exports = DietaryPreferenceController;
