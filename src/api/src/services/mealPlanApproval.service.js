const { MealPlanApproval } = require('../models');
const MealPlanService = require('./mealPlan.service');
const NotificationService = require('./notification.service');
const logger = require('../utils/logger');

/**
 * MealPlanApproval service
 */
class MealPlanApprovalService {
  /**
   * Submit a meal plan for approval
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} memberId - Member ID who is submitting the plan
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Submitted meal plan version
   */
  static async submitMealPlanForApproval(mealPlanId, memberId, tenantId) {
    try {
      // Get the meal plan
      const mealPlan = await MealPlanService.getMealPlan(mealPlanId, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${mealPlanId}`);
      }
      
      // Check if the meal plan is in draft status
      if (mealPlan.status !== 'draft') {
        throw new Error(`Meal plan must be in draft status to submit for approval`);
      }
      
      // Get the latest version number or start with 1
      let versionNumber = 1;
      const latestVersion = await MealPlanApproval.getLatestVersion(mealPlanId, tenantId);
      
      if (latestVersion) {
        versionNumber = latestVersion.version_number + 1;
      }
      
      // Create a new version
      const versionData = {
        mealPlanId,
        versionNumber,
        createdBy: memberId,
        status: 'submitted',
        mealPlanData: mealPlan, // Store the current state of the meal plan
        tenantId
      };
      
      const version = await MealPlanApproval.createVersion(versionData);
      
      // Update the meal plan approval status
      await MealPlanApproval.updateMealPlanApprovalStatus(mealPlanId, 'pending', tenantId);
      
      // Send notifications to household members
      try {
        await this._sendApprovalRequestNotifications(mealPlan, version, tenantId);
      } catch (notificationError) {
        logger.warn(`Failed to send approval request notifications: ${notificationError.message}`);
      }
      
      logger.info(`Submitted meal plan ${mealPlanId} for approval (version ${versionNumber})`);
      return version;
    } catch (error) {
      logger.error(`Error submitting meal plan ${mealPlanId} for approval:`, error);
      throw error;
    }
  }

  /**
   * Submit an approval response for a meal plan
   * @param {Object} data - Approval data
   * @param {string} data.mealPlanId - Meal plan ID
   * @param {string} data.memberId - Member ID
   * @param {number} data.versionNumber - Version number
   * @param {string} data.response - Response (approved, rejected, partially_approved)
   * @param {string} data.feedback - Feedback text
   * @param {Array} data.itemApprovals - Item-level approvals (optional)
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Approval response
   */
  static async submitApprovalResponse(data, tenantId) {
    try {
      const { 
        mealPlanId, 
        memberId, 
        versionNumber, 
        response, 
        feedback,
        itemApprovals
      } = data;
      
      // Validate the response type
      const validResponses = ['approved', 'rejected', 'partially_approved'];
      if (!validResponses.includes(response)) {
        throw new Error(`Invalid response type: ${response}. Must be one of: ${validResponses.join(', ')}`);
      }
      
      // Check if the meal plan and version exist
      const mealPlan = await MealPlanService.getMealPlan(mealPlanId, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${mealPlanId}`);
      }
      
      const version = await MealPlanApproval.getVersion(mealPlanId, versionNumber, tenantId);
      
      if (!version) {
        throw new Error(`Meal plan version not found: ${mealPlanId} version ${versionNumber}`);
      }
      
      // Submit the approval
      const approvalData = {
        mealPlanId,
        memberId,
        versionNumber,
        response,
        feedback,
        tenantId
      };
      
      const approval = await MealPlanApproval.submitApproval(approvalData);
      
      // If there are item-level approvals, submit those too
      if (itemApprovals && itemApprovals.length > 0) {
        await MealPlanApproval.submitItemApprovals(approval.id, itemApprovals, tenantId);
      }
      
      // Check if consensus has been reached
      const consensus = await MealPlanApproval.calculateConsensus(mealPlanId, versionNumber, tenantId);
      
      if (consensus.consensusReached) {
        // Update the meal plan approval status based on consensus
        await MealPlanApproval.updateMealPlanApprovalStatus(mealPlanId, consensus.consensusType, tenantId);
        
        // If approved or partially approved, update the meal plan status to active
        if (['approved', 'partially_approved'].includes(consensus.consensusType)) {
          await MealPlanService.updateMealPlan(mealPlanId, { status: 'active' }, tenantId);
          
          // Send notifications about the approved meal plan
          try {
            await this._sendMealPlanApprovedNotifications(mealPlan, version, tenantId);
          } catch (notificationError) {
            logger.warn(`Failed to send meal plan approved notifications: ${notificationError.message}`);
          }
        } else if (consensus.consensusType === 'rejected') {
          // If rejected, keep the meal plan in draft status for revision
          await MealPlanService.updateMealPlan(mealPlanId, { status: 'draft' }, tenantId);
          
          // Send notifications about the rejected meal plan
          try {
            await this._sendMealPlanRejectedNotifications(mealPlan, version, tenantId);
          } catch (notificationError) {
            logger.warn(`Failed to send meal plan rejected notifications: ${notificationError.message}`);
          }
        }
      } else {
        // Send notification to the member who submitted the response
        try {
          await this._sendApprovalResponseReceivedNotification(mealPlan, version, memberId, response, tenantId);
        } catch (notificationError) {
          logger.warn(`Failed to send approval response notification: ${notificationError.message}`);
        }
      }
      
      logger.info(`Member ${memberId} submitted ${response} response for meal plan ${mealPlanId} version ${versionNumber}`);
      return approval;
    } catch (error) {
      logger.error(`Error submitting approval response:`, error);
      throw error;
    }
  }

  /**
   * Add a comment to a meal plan version
   * @param {Object} data - Comment data
   * @param {string} data.mealPlanId - Meal plan ID
   * @param {string} data.memberId - Member ID
   * @param {number} data.versionNumber - Version number
   * @param {string} data.comment - Comment text
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created comment
   */
  static async addComment(data, tenantId) {
    try {
      const { mealPlanId, memberId, versionNumber, comment } = data;
      
      // Check if the meal plan and version exist
      const mealPlan = await MealPlanService.getMealPlan(mealPlanId, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${mealPlanId}`);
      }
      
      const version = await MealPlanApproval.getVersion(mealPlanId, versionNumber, tenantId);
      
      if (!version) {
        throw new Error(`Meal plan version not found: ${mealPlanId} version ${versionNumber}`);
      }
      
      // Add the comment
      const commentData = {
        mealPlanId,
        memberId,
        versionNumber,
        comment,
        tenantId
      };
      
      const createdComment = await MealPlanApproval.addComment(commentData);
      
      // Send notification about the new comment
      try {
        await this._sendNewCommentNotification(mealPlan, version, memberId, comment, tenantId);
      } catch (notificationError) {
        logger.warn(`Failed to send new comment notification: ${notificationError.message}`);
      }
      
      logger.info(`Member ${memberId} added comment to meal plan ${mealPlanId} version ${versionNumber}`);
      return createdComment;
    } catch (error) {
      logger.error(`Error adding comment:`, error);
      throw error;
    }
  }

  /**
   * Get approval details for a meal plan version
   * @param {string} mealPlanId - Meal plan ID
   * @param {number} versionNumber - Version number
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Approval details
   */
  static async getApprovalDetails(mealPlanId, versionNumber, tenantId) {
    try {
      // Check if the meal plan and version exist
      const mealPlan = await MealPlanService.getMealPlan(mealPlanId, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${mealPlanId}`);
      }
      
      const version = await MealPlanApproval.getVersion(mealPlanId, versionNumber, tenantId);
      
      if (!version) {
        throw new Error(`Meal plan version not found: ${mealPlanId} version ${versionNumber}`);
      }
      
      // Get approvals, comments, and consensus
      const approvals = await MealPlanApproval.getApprovals(mealPlanId, versionNumber, tenantId);
      const comments = await MealPlanApproval.getComments(mealPlanId, versionNumber, tenantId);
      const consensus = await MealPlanApproval.calculateConsensus(mealPlanId, versionNumber, tenantId);
      
      // Get item approvals for each approval
      const approvalsWithItems = await Promise.all(
        approvals.map(async (approval) => {
          const itemApprovals = await MealPlanApproval.getItemApprovals(approval.id, tenantId);
          return {
            ...approval,
            itemApprovals
          };
        })
      );
      
      return {
        mealPlan,
        version,
        approvals: approvalsWithItems,
        comments,
        consensus
      };
    } catch (error) {
      logger.error(`Error getting approval details for meal plan ${mealPlanId} version ${versionNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get all versions of a meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Meal plan versions
   */
  static async getMealPlanVersions(mealPlanId, tenantId) {
    try {
      // Check if the meal plan exists
      const mealPlan = await MealPlanService.getMealPlan(mealPlanId, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${mealPlanId}`);
      }
      
      // Get all versions
      const versions = await MealPlanApproval.getAllVersions(mealPlanId, tenantId);
      
      return versions;
    } catch (error) {
      logger.error(`Error getting versions for meal plan ${mealPlanId}:`, error);
      throw error;
    }
  }

  /**
   * Revise a meal plan based on feedback
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} memberId - Member ID who is revising the plan
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated meal plan
   */
  static async reviseMealPlan(mealPlanId, memberId, tenantId) {
    try {
      // Get the meal plan
      const mealPlan = await MealPlanService.getMealPlan(mealPlanId, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${mealPlanId}`);
      }
      
      // Check if the meal plan can be revised (must be in draft status or rejected)
      if (!['draft', 'rejected'].includes(mealPlan.approval_status)) {
        throw new Error(`Meal plan cannot be revised: current approval status is ${mealPlan.approval_status}`);
      }
      
      // Update the meal plan status to draft
      await MealPlanService.updateMealPlan(mealPlanId, { status: 'draft' }, tenantId);
      
      // Reset the approval status
      await MealPlanApproval.updateMealPlanApprovalStatus(mealPlanId, 'pending', tenantId);
      
      logger.info(`Meal plan ${mealPlanId} set to draft status for revision by member ${memberId}`);
      
      // Return the updated meal plan
      return await MealPlanService.getMealPlan(mealPlanId, tenantId);
    } catch (error) {
      logger.error(`Error revising meal plan ${mealPlanId}:`, error);
      throw error;
    }
  }

  /**
   * Finalize an approved meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Finalized meal plan
   */
  static async finalizeMealPlan(mealPlanId, tenantId) {
    try {
      // Get the meal plan
      const mealPlan = await MealPlanService.getMealPlan(mealPlanId, tenantId);
      
      if (!mealPlan) {
        throw new Error(`Meal plan not found: ${mealPlanId}`);
      }
      
      // Check if the meal plan is approved
      if (!['approved', 'partially_approved'].includes(mealPlan.approval_status)) {
        throw new Error(`Meal plan must be approved to finalize: current approval status is ${mealPlan.approval_status}`);
      }
      
      // Update the meal plan status to active
      await MealPlanService.updateMealPlan(mealPlanId, { status: 'active' }, tenantId);
      
      // Send notifications about the finalized meal plan
      try {
        await this._sendMealPlanFinalizedNotifications(mealPlan, tenantId);
      } catch (notificationError) {
        logger.warn(`Failed to send meal plan finalized notifications: ${notificationError.message}`);
      }
      
      logger.info(`Meal plan ${mealPlanId} finalized`);
      
      // Return the finalized meal plan
      return await MealPlanService.getMealPlan(mealPlanId, tenantId);
    } catch (error) {
      logger.error(`Error finalizing meal plan ${mealPlanId}:`, error);
      throw error;
    }
  }

  /**
   * Send approval request notifications to household members
   * @param {Object} mealPlan - Meal plan
   * @param {Object} version - Meal plan version
   * @param {string} tenantId - Tenant ID
   * @private
   */
  static async _sendApprovalRequestNotifications(mealPlan, version, tenantId) {
    try {
      // Check if NotificationService is available
      if (!NotificationService) {
        logger.warn('NotificationService not available, skipping approval request notifications');
        return;
      }
      
      // Get household members
      const householdId = mealPlan.household_id;
      const members = await this._getHouseholdMembers(householdId, tenantId);
      
      // Create notification for each member
      for (const member of members) {
        const notificationData = {
          type: 'meal_plan_approval_request',
          title: 'Meal Plan Approval Requested',
          body: `A new meal plan "${mealPlan.name}" is ready for your review and approval.`,
          data: {
            mealPlanId: mealPlan.id,
            versionNumber: version.version_number,
            mealPlanName: mealPlan.name,
            startDate: mealPlan.start_date,
            endDate: mealPlan.end_date
          },
          recipientType: 'member',
          recipientId: member.id,
          tenantId
        };
        
        await NotificationService.createNotification(notificationData);
      }
      
      logger.info(`Sent approval request notifications for meal plan ${mealPlan.id} to ${members.length} members`);
    } catch (error) {
      logger.error(`Error sending approval request notifications:`, error);
      throw error;
    }
  }

  /**
   * Send notification when a member responds to an approval request
   * @param {Object} mealPlan - Meal plan
   * @param {Object} version - Meal plan version
   * @param {string} memberId - Member ID who responded
   * @param {string} response - Response type
   * @param {string} tenantId - Tenant ID
   * @private
   */
  static async _sendApprovalResponseReceivedNotification(mealPlan, version, memberId, response, tenantId) {
    try {
      // Check if NotificationService is available
      if (!NotificationService) {
        logger.warn('NotificationService not available, skipping approval response notification');
        return;
      }
      
      // Get member name
      const member = await this._getMember(memberId, tenantId);
      const memberName = member ? member.name : 'A household member';
      
      // Create notification for the household
      const responseText = response === 'approved' ? 'approved' : 
                          response === 'rejected' ? 'rejected' : 
                          'partially approved';
      
      const notificationData = {
        type: 'meal_plan_approval_response',
        title: 'Meal Plan Response Received',
        body: `${memberName} has ${responseText} the meal plan "${mealPlan.name}".`,
        data: {
          mealPlanId: mealPlan.id,
          versionNumber: version.version_number,
          mealPlanName: mealPlan.name,
          memberId,
          memberName,
          response
        },
        recipientType: 'household',
        recipientId: mealPlan.household_id,
        tenantId
      };
      
      await NotificationService.createNotification(notificationData);
      
      logger.info(`Sent approval response notification for member ${memberId} response to meal plan ${mealPlan.id}`);
    } catch (error) {
      logger.error(`Error sending approval response notification:`, error);
      throw error;
    }
  }

  /**
   * Send notifications when a meal plan is approved
   * @param {Object} mealPlan - Meal plan
   * @param {Object} version - Meal plan version
   * @param {string} tenantId - Tenant ID
   * @private
   */
  static async _sendMealPlanApprovedNotifications(mealPlan, version, tenantId) {
    try {
      // Check if NotificationService is available
      if (!NotificationService) {
        logger.warn('NotificationService not available, skipping meal plan approved notifications');
        return;
      }
      
      // Create notification for the household
      const notificationData = {
        type: 'meal_plan_approved',
        title: 'Meal Plan Approved',
        body: `The meal plan "${mealPlan.name}" has been approved by all household members.`,
        data: {
          mealPlanId: mealPlan.id,
          versionNumber: version.version_number,
          mealPlanName: mealPlan.name,
          startDate: mealPlan.start_date,
          endDate: mealPlan.end_date
        },
        recipientType: 'household',
        recipientId: mealPlan.household_id,
        tenantId
      };
      
      await NotificationService.createNotification(notificationData);
      
      logger.info(`Sent meal plan approved notification for meal plan ${mealPlan.id}`);
    } catch (error) {
      logger.error(`Error sending meal plan approved notification:`, error);
      throw error;
    }
  }

  /**
   * Send notifications when a meal plan is rejected
   * @param {Object} mealPlan - Meal plan
   * @param {Object} version - Meal plan version
   * @param {string} tenantId - Tenant ID
   * @private
   */
  static async _sendMealPlanRejectedNotifications(mealPlan, version, tenantId) {
    try {
      // Check if NotificationService is available
      if (!NotificationService) {
        logger.warn('NotificationService not available, skipping meal plan rejected notifications');
        return;
      }
      
      // Create notification for the household
      const notificationData = {
        type: 'meal_plan_rejected',
        title: 'Meal Plan Rejected',
        body: `The meal plan "${mealPlan.name}" has been rejected and needs revision.`,
        data: {
          mealPlanId: mealPlan.id,
          versionNumber: version.version_number,
          mealPlanName: mealPlan.name
        },
        recipientType: 'household',
        recipientId: mealPlan.household_id,
        tenantId
      };
      
      await NotificationService.createNotification(notificationData);
      
      logger.info(`Sent meal plan rejected notification for meal plan ${mealPlan.id}`);
    } catch (error) {
      logger.error(`Error sending meal plan rejected notification:`, error);
      throw error;
    }
  }

  /**
   * Send notification when a new comment is added
   * @param {Object} mealPlan - Meal plan
   * @param {Object} version - Meal plan version
   * @param {string} memberId - Member ID who commented
   * @param {string} comment - Comment text
   * @param {string} tenantId - Tenant ID
   * @private
   */
  static async _sendNewCommentNotification(mealPlan, version, memberId, comment, tenantId) {
    try {
      // Check if NotificationService is available
      if (!NotificationService) {
        logger.warn('NotificationService not available, skipping new comment notification');
        return;
      }
      
      // Get member name
      const member = await this._getMember(memberId, tenantId);
      const memberName = member ? member.name : 'A household member';
      
      // Create notification for the household
      const notificationData = {
        type: 'meal_plan_comment',
        title: 'New Meal Plan Comment',
        body: `${memberName} commented on the meal plan "${mealPlan.name}".`,
        data: {
          mealPlanId: mealPlan.id,
          versionNumber: version.version_number,
          mealPlanName: mealPlan.name,
          memberId,
          memberName,
          comment: comment.length > 100 ? `${comment.substring(0, 97)}...` : comment
        },
        recipientType: 'household',
        recipientId: mealPlan.household_id,
        tenantId
      };
      
      await NotificationService.createNotification(notificationData);
      
      logger.info(`Sent new comment notification for meal plan ${mealPlan.id}`);
    } catch (error) {
      logger.error(`Error sending new comment notification:`, error);
      throw error;
    }
  }

  /**
   * Send notifications when a meal plan is finalized
   * @param {Object} mealPlan - Meal plan
   * @param {string} tenantId - Tenant ID
   * @private
   */
  static async _sendMealPlanFinalizedNotifications(mealPlan, tenantId) {
    try {
      // Check if NotificationService is available
      if (!NotificationService) {
        logger.warn('NotificationService not available, skipping meal plan finalized notifications');
        return;
      }
      
      // Create notification for the household
      const notificationData = {
        type: 'meal_plan_finalized',
        title: 'Meal Plan Finalized',
        body: `The meal plan "${mealPlan.name}" has been finalized and is now active.`,
        data: {
          mealPlanId: mealPlan.id,
          mealPlanName: mealPlan.name,
          startDate: mealPlan.start_date,
          endDate: mealPlan.end_date
        },
        recipientType: 'household',
        recipientId: mealPlan.household_id,
        tenantId
      };
      
      await NotificationService.createNotification(notificationData);
      
      logger.info(`Sent meal plan finalized notification for meal plan ${mealPlan.id}`);
    } catch (error) {
      logger.error(`Error sending meal plan finalized notification:`, error);
      throw error;
    }
  }

  /**
   * Get household members
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Household members
   * @private
   */
  static async _getHouseholdMembers(householdId, tenantId) {
    try {
      // This would normally use the Member model
      // For now, use a placeholder implementation
      return [
        { id: 'member1', name: 'John Doe' },
        { id: 'member2', name: 'Jane Doe' }
      ];
    } catch (error) {
      logger.error(`Error getting members for household ${householdId}:`, error);
      throw error;
    }
  }

  /**
   * Get a member by ID
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Member
   * @private
   */
  static async _getMember(memberId, tenantId) {
    try {
      // This would normally use the Member model
      // For now, use a placeholder implementation
      const members = {
        'member1': { id: 'member1', name: 'John Doe' },
        'member2': { id: 'member2', name: 'Jane Doe' }
      };
      
      return members[memberId] || null;
    } catch (error) {
      logger.error(`Error getting member ${memberId}:`, error);
      throw error;
    }
  }
}

module.exports = MealPlanApprovalService;
