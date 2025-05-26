const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * MealPlanApproval model
 */
class MealPlanApproval {
  /**
   * Create a new version of a meal plan
   * @param {Object} data - Meal plan version data
   * @param {string} data.mealPlanId - Meal plan ID
   * @param {number} data.versionNumber - Version number
   * @param {string} data.createdBy - Member ID who created this version
   * @param {string} data.status - Status (draft, submitted, approved, rejected)
   * @param {Object} data.mealPlanData - Snapshot of the meal plan data
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal plan version
   */
  static async createVersion(data) {
    const { 
      mealPlanId, 
      versionNumber, 
      createdBy, 
      status = 'draft', 
      mealPlanData, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();

    try {
      const query = `
        INSERT INTO meal_plan_versions (
          id, meal_plan_id, version_number, created_at, created_by, 
          status, data, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, meal_plan_id, version_number, created_at, created_by, 
                  status, data, tenant_id
      `;
      
      const values = [
        id, mealPlanId, versionNumber, createdAt, createdBy, 
        status, mealPlanData, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating meal plan version:', error);
      throw new Error(`Failed to create meal plan version: ${error.message}`);
    }
  }

  /**
   * Get the latest version of a meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Latest meal plan version
   */
  static async getLatestVersion(mealPlanId, tenantId) {
    try {
      const query = `
        SELECT id, meal_plan_id, version_number, created_at, created_by, 
               status, data, tenant_id
        FROM meal_plan_versions
        WHERE meal_plan_id = $1 AND tenant_id = $2
        ORDER BY version_number DESC
        LIMIT 1
      `;
      
      const values = [mealPlanId, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting latest version for meal plan ${mealPlanId}:`, error);
      throw new Error(`Failed to get latest meal plan version: ${error.message}`);
    }
  }

  /**
   * Get a specific version of a meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {number} versionNumber - Version number
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Meal plan version
   */
  static async getVersion(mealPlanId, versionNumber, tenantId) {
    try {
      const query = `
        SELECT id, meal_plan_id, version_number, created_at, created_by, 
               status, data, tenant_id
        FROM meal_plan_versions
        WHERE meal_plan_id = $1 AND version_number = $2 AND tenant_id = $3
      `;
      
      const values = [mealPlanId, versionNumber, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting version ${versionNumber} for meal plan ${mealPlanId}:`, error);
      throw new Error(`Failed to get meal plan version: ${error.message}`);
    }
  }

  /**
   * Get all versions of a meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Meal plan versions
   */
  static async getAllVersions(mealPlanId, tenantId) {
    try {
      const query = `
        SELECT id, meal_plan_id, version_number, created_at, created_by, 
               status, data, tenant_id
        FROM meal_plan_versions
        WHERE meal_plan_id = $1 AND tenant_id = $2
        ORDER BY version_number DESC
      `;
      
      const values = [mealPlanId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting all versions for meal plan ${mealPlanId}:`, error);
      throw new Error(`Failed to get meal plan versions: ${error.message}`);
    }
  }

  /**
   * Submit a meal plan approval response
   * @param {Object} data - Approval data
   * @param {string} data.mealPlanId - Meal plan ID
   * @param {string} data.memberId - Member ID
   * @param {number} data.versionNumber - Version number
   * @param {string} data.response - Response (approved, rejected, partially_approved)
   * @param {string} data.feedback - Feedback text
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created approval
   */
  static async submitApproval(data) {
    const { 
      mealPlanId, 
      memberId, 
      versionNumber, 
      response, 
      feedback, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const responseDate = new Date();

    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Check if this member already responded to this version
      const checkQuery = `
        SELECT id FROM meal_plan_approvals
        WHERE meal_plan_id = $1 AND member_id = $2 AND version_number = $3 AND tenant_id = $4
      `;
      
      const checkValues = [mealPlanId, memberId, versionNumber, tenantId];
      const checkResult = await pool.query(checkQuery, checkValues);
      
      if (checkResult.rows.length > 0) {
        // Delete existing response
        const deleteQuery = `
          DELETE FROM meal_plan_approvals
          WHERE id = $1
        `;
        
        await pool.query(deleteQuery, [checkResult.rows[0].id]);
      }
      
      // Insert new approval
      const insertQuery = `
        INSERT INTO meal_plan_approvals (
          id, meal_plan_id, member_id, version_number, response, 
          response_date, feedback, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, meal_plan_id, member_id, version_number, response, 
                  response_date, feedback, tenant_id
      `;
      
      const insertValues = [
        id, mealPlanId, memberId, versionNumber, response, 
        responseDate, feedback, tenantId
      ];
      
      const result = await pool.query(insertQuery, insertValues);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error('Error submitting meal plan approval:', error);
      throw new Error(`Failed to submit meal plan approval: ${error.message}`);
    }
  }

  /**
   * Submit item-level approvals
   * @param {string} approvalId - Meal plan approval ID
   * @param {Array} items - Array of item approval data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Created item approvals
   */
  static async submitItemApprovals(approvalId, items, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Delete existing item approvals
      const deleteQuery = `
        DELETE FROM meal_plan_item_approvals
        WHERE meal_plan_approval_id = $1 AND tenant_id = $2
      `;
      
      await pool.query(deleteQuery, [approvalId, tenantId]);
      
      // Insert new item approvals
      const results = [];
      
      for (const item of items) {
        const { mealPlanItemId, response, suggestedRecipeId, feedback } = item;
        
        const id = uuidv4();
        
        const insertQuery = `
          INSERT INTO meal_plan_item_approvals (
            id, meal_plan_approval_id, meal_plan_item_id, response, 
            suggested_recipe_id, feedback, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, meal_plan_approval_id, meal_plan_item_id, response, 
                    suggested_recipe_id, feedback, tenant_id
        `;
        
        const insertValues = [
          id, approvalId, mealPlanItemId, response, 
          suggestedRecipeId, feedback, tenantId
        ];
        
        const result = await pool.query(insertQuery, insertValues);
        results.push(result.rows[0]);
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return results;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error submitting item approvals for approval ${approvalId}:`, error);
      throw new Error(`Failed to submit item approvals: ${error.message}`);
    }
  }

  /**
   * Get all approvals for a meal plan version
   * @param {string} mealPlanId - Meal plan ID
   * @param {number} versionNumber - Version number
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Meal plan approvals
   */
  static async getApprovals(mealPlanId, versionNumber, tenantId) {
    try {
      const query = `
        SELECT mpa.id, mpa.meal_plan_id, mpa.member_id, mpa.version_number, 
               mpa.response, mpa.response_date, mpa.feedback, mpa.tenant_id,
               m.name as member_name
        FROM meal_plan_approvals mpa
        JOIN members m ON mpa.member_id = m.id
        WHERE mpa.meal_plan_id = $1 AND mpa.version_number = $2 AND mpa.tenant_id = $3
        ORDER BY mpa.response_date DESC
      `;
      
      const values = [mealPlanId, versionNumber, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting approvals for meal plan ${mealPlanId} version ${versionNumber}:`, error);
      throw new Error(`Failed to get meal plan approvals: ${error.message}`);
    }
  }

  /**
   * Get item approvals for a meal plan approval
   * @param {string} approvalId - Meal plan approval ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Item approvals
   */
  static async getItemApprovals(approvalId, tenantId) {
    try {
      const query = `
        SELECT mpia.id, mpia.meal_plan_approval_id, mpia.meal_plan_item_id, 
               mpia.response, mpia.suggested_recipe_id, mpia.feedback, mpia.tenant_id,
               r.title as recipe_title, r.image_url as recipe_image_url
        FROM meal_plan_item_approvals mpia
        LEFT JOIN recipes r ON mpia.suggested_recipe_id = r.id
        WHERE mpia.meal_plan_approval_id = $1 AND mpia.tenant_id = $2
      `;
      
      const values = [approvalId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting item approvals for approval ${approvalId}:`, error);
      throw new Error(`Failed to get item approvals: ${error.message}`);
    }
  }

  /**
   * Add a comment to a meal plan
   * @param {Object} data - Comment data
   * @param {string} data.mealPlanId - Meal plan ID
   * @param {string} data.memberId - Member ID
   * @param {number} data.versionNumber - Version number
   * @param {string} data.comment - Comment text
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created comment
   */
  static async addComment(data) {
    const { 
      mealPlanId, 
      memberId, 
      versionNumber, 
      comment, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();

    try {
      const query = `
        INSERT INTO meal_plan_comments (
          id, meal_plan_id, member_id, version_number, comment, 
          created_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, meal_plan_id, member_id, version_number, comment, 
                  created_at, tenant_id
      `;
      
      const values = [
        id, mealPlanId, memberId, versionNumber, comment, 
        createdAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding meal plan comment:', error);
      throw new Error(`Failed to add meal plan comment: ${error.message}`);
    }
  }

  /**
   * Get comments for a meal plan version
   * @param {string} mealPlanId - Meal plan ID
   * @param {number} versionNumber - Version number
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Comments
   */
  static async getComments(mealPlanId, versionNumber, tenantId) {
    try {
      const query = `
        SELECT mpc.id, mpc.meal_plan_id, mpc.member_id, mpc.version_number, 
               mpc.comment, mpc.created_at, mpc.tenant_id,
               m.name as member_name
        FROM meal_plan_comments mpc
        JOIN members m ON mpc.member_id = m.id
        WHERE mpc.meal_plan_id = $1 AND mpc.version_number = $2 AND mpc.tenant_id = $3
        ORDER BY mpc.created_at DESC
      `;
      
      const values = [mealPlanId, versionNumber, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting comments for meal plan ${mealPlanId} version ${versionNumber}:`, error);
      throw new Error(`Failed to get meal plan comments: ${error.message}`);
    }
  }

  /**
   * Update meal plan approval status
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} status - New status (pending, approved, rejected, partially_approved)
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated meal plan
   */
  static async updateMealPlanApprovalStatus(mealPlanId, status, tenantId) {
    try {
      const query = `
        UPDATE meal_plans
        SET approval_status = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
        RETURNING id, household_id, name, start_date, end_date, status, 
                  approval_status, created_at, updated_at, tenant_id
      `;
      
      const values = [status, mealPlanId, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Meal plan not found: ${mealPlanId}`);
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating meal plan approval status for ${mealPlanId}:`, error);
      throw new Error(`Failed to update meal plan approval status: ${error.message}`);
    }
  }

  /**
   * Calculate approval consensus for a meal plan version
   * @param {string} mealPlanId - Meal plan ID
   * @param {number} versionNumber - Version number
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Consensus data
   */
  static async calculateConsensus(mealPlanId, versionNumber, tenantId) {
    try {
      // Get all approvals for this version
      const approvals = await this.getApprovals(mealPlanId, versionNumber, tenantId);
      
      if (approvals.length === 0) {
        return {
          totalMembers: 0,
          respondedMembers: 0,
          approved: 0,
          rejected: 0,
          partiallyApproved: 0,
          consensusReached: false,
          consensusType: null
        };
      }
      
      // Get total household members
      const householdQuery = `
        SELECT household_id FROM meal_plans WHERE id = $1 AND tenant_id = $2
      `;
      const householdResult = await pool.query(householdQuery, [mealPlanId, tenantId]);
      
      if (householdResult.rows.length === 0) {
        throw new Error(`Meal plan not found: ${mealPlanId}`);
      }
      
      const householdId = householdResult.rows[0].household_id;
      
      const membersQuery = `
        SELECT COUNT(*) as total FROM members 
        WHERE household_id = $1 AND active = true AND tenant_id = $2
      `;
      const membersResult = await pool.query(membersQuery, [householdId, tenantId]);
      
      const totalMembers = parseInt(membersResult.rows[0].total);
      const respondedMembers = approvals.length;
      
      // Count responses by type
      const approved = approvals.filter(a => a.response === 'approved').length;
      const rejected = approvals.filter(a => a.response === 'rejected').length;
      const partiallyApproved = approvals.filter(a => a.response === 'partially_approved').length;
      
      // Determine if consensus is reached
      let consensusReached = false;
      let consensusType = null;
      
      if (respondedMembers === totalMembers) {
        if (approved === totalMembers) {
          consensusReached = true;
          consensusType = 'approved';
        } else if (rejected === totalMembers) {
          consensusReached = true;
          consensusType = 'rejected';
        } else if (approved + partiallyApproved === totalMembers) {
          consensusReached = true;
          consensusType = 'partially_approved';
        }
      }
      
      return {
        totalMembers,
        respondedMembers,
        approved,
        rejected,
        partiallyApproved,
        consensusReached,
        consensusType
      };
    } catch (error) {
      logger.error(`Error calculating consensus for meal plan ${mealPlanId} version ${versionNumber}:`, error);
      throw new Error(`Failed to calculate consensus: ${error.message}`);
    }
  }
}

module.exports = MealPlanApproval;
