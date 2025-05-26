const { HouseholdGroupService } = require('../services');
const logger = require('../utils/logger');

/**
 * HouseholdGroup controller
 */
class HouseholdGroupController {
  /**
   * Create a new household group
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async createGroup(req, res, next) {
    try {
      const { householdId } = req.params;
      const { name, description } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!name) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameter: name',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const groupData = {
        name,
        description
      };
      
      const group = await HouseholdGroupService.createGroup(householdId, groupData, tenantId);
      
      res.status(201).json(group);
    } catch (error) {
      logger.error(`Error in createGroup controller for household ${req.params.householdId}:`, error);
      
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
   * Get a household group by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getGroup(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const group = await HouseholdGroupService.getGroup(id, tenantId);
      
      res.json(group);
    } catch (error) {
      logger.error(`Error in getGroup controller for ID ${req.params.id}:`, error);
      
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
   * Get all groups for a household
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getHouseholdGroups(req, res, next) {
    try {
      const { householdId } = req.params;
      const tenantId = req.user.tenantId;
      
      const groups = await HouseholdGroupService.getHouseholdGroups(householdId, tenantId);
      
      res.json(groups);
    } catch (error) {
      logger.error(`Error in getHouseholdGroups controller for household ${req.params.householdId}:`, error);
      
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
   * Update a household group
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateGroup(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!name && !description) {
        return res.status(400).json({
          error: {
            message: 'No update parameters provided',
            code: 'INVALID_REQUEST'
          }
        });
      }
      
      const updateData = {};
      if (name) updateData.name = name;
      if (description) updateData.description = description;
      
      const group = await HouseholdGroupService.updateGroup(id, updateData, tenantId);
      
      res.json(group);
    } catch (error) {
      logger.error(`Error in updateGroup controller for ID ${req.params.id}:`, error);
      
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
   * Delete a household group
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async deleteGroup(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      await HouseholdGroupService.deleteGroup(id, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in deleteGroup controller for ID ${req.params.id}:`, error);
      
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
   * Add a member to a group
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async addMemberToGroup(req, res, next) {
    try {
      const { groupId, memberId } = req.params;
      const { isPrimary = false } = req.body;
      const tenantId = req.user.tenantId;
      
      const groupMember = await HouseholdGroupService.addMemberToGroup(groupId, memberId, isPrimary, tenantId);
      
      res.status(201).json(groupMember);
    } catch (error) {
      logger.error(`Error in addMemberToGroup controller for group ${req.params.groupId} and member ${req.params.memberId}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND'
          }
        });
      }
      
      if (error.message.includes('already in group')) {
        return res.status(409).json({
          error: {
            message: error.message,
            code: 'ALREADY_EXISTS'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Remove a member from a group
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async removeMemberFromGroup(req, res, next) {
    try {
      const { groupId, memberId } = req.params;
      const tenantId = req.user.tenantId;
      
      await HouseholdGroupService.removeMemberFromGroup(groupId, memberId, tenantId);
      
      res.status(204).end();
    } catch (error) {
      logger.error(`Error in removeMemberFromGroup controller for group ${req.params.groupId} and member ${req.params.memberId}:`, error);
      
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
   * Get members of a group
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getGroupMembers(req, res, next) {
    try {
      const { groupId } = req.params;
      const tenantId = req.user.tenantId;
      
      const members = await HouseholdGroupService.getGroupMembers(groupId, tenantId);
      
      res.json(members);
    } catch (error) {
      logger.error(`Error in getGroupMembers controller for group ${req.params.groupId}:`, error);
      
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
   * Set a member as primary for a group
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async setPrimaryMember(req, res, next) {
    try {
      const { groupId, memberId } = req.params;
      const tenantId = req.user.tenantId;
      
      const groupMember = await HouseholdGroupService.setPrimaryMember(groupId, memberId, tenantId);
      
      res.json(groupMember);
    } catch (error) {
      logger.error(`Error in setPrimaryMember controller for group ${req.params.groupId} and member ${req.params.memberId}:`, error);
      
      if (error.message.includes('not found') || error.message.includes('not in group')) {
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
   * Get groups a member belongs to
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMemberGroups(req, res, next) {
    try {
      const { memberId } = req.params;
      const tenantId = req.user.tenantId;
      
      const groups = await HouseholdGroupService.getMemberGroups(memberId, tenantId);
      
      res.json(groups);
    } catch (error) {
      logger.error(`Error in getMemberGroups controller for member ${req.params.memberId}:`, error);
      
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
   * Associate a meal plan with a group
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async associateMealPlanWithGroup(req, res, next) {
    try {
      const { groupId, mealPlanId } = req.params;
      const tenantId = req.user.tenantId;
      
      const mealPlanGroup = await HouseholdGroupService.associateMealPlanWithGroup(mealPlanId, groupId, tenantId);
      
      res.status(201).json(mealPlanGroup);
    } catch (error) {
      logger.error(`Error in associateMealPlanWithGroup controller for group ${req.params.groupId} and meal plan ${req.params.mealPlanId}:`, error);
      
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
   * Get meal plans for a group
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getGroupMealPlans(req, res, next) {
    try {
      const { groupId } = req.params;
      const tenantId = req.user.tenantId;
      
      const mealPlans = await HouseholdGroupService.getGroupMealPlans(groupId, tenantId);
      
      res.json(mealPlans);
    } catch (error) {
      logger.error(`Error in getGroupMealPlans controller for group ${req.params.groupId}:`, error);
      
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
   * Get groups for a meal plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMealPlanGroups(req, res, next) {
    try {
      const { mealPlanId } = req.params;
      const tenantId = req.user.tenantId;
      
      const groups = await HouseholdGroupService.getMealPlanGroups(mealPlanId, tenantId);
      
      res.json(groups);
    } catch (error) {
      logger.error(`Error in getMealPlanGroups controller for meal plan ${req.params.mealPlanId}:`, error);
      next(error);
    }
  }
}

module.exports = HouseholdGroupController; 