const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');
const { redisClient } = require('../services/redis');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * CookingSession model
 */
class CookingSession {
  /**
   * Create a new cooking session
   * @param {Object} data - Cooking session data
   * @param {string} data.recipeId - Recipe ID
   * @param {string} data.memberId - Member ID 
   * @param {string} data.householdId - Household ID
   * @param {string} data.redisKey - Redis key for session data
   * @param {string} data.status - Status (active, completed, abandoned)
   * @param {number} data.currentStep - Current step in the recipe
   * @param {Array} data.messages - Conversation messages
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created cooking session
   */
  static async create(data) {
    const {
      recipeId,
      memberId,
      householdId,
      redisKey,
      status = 'active',
      currentStep = 0,
      messages = [],
      tenantId
    } = data;
    
    const id = uuidv4();
    const startTime = new Date();
    const createdAt = startTime;
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO cooking_sessions (
          id, recipe_id, member_id, household_id, redis_key, status, 
          current_step, messages, start_time, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, recipe_id, member_id, household_id, redis_key, status, 
                 current_step, messages, start_time, created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, recipeId, memberId, householdId, redisKey, status,
        currentStep, JSON.stringify(messages), startTime, createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating cooking session:', error);
      throw new Error(`Failed to create cooking session: ${error.message}`);
    }
  }

  /**
   * Get a cooking session by ID
   * @param {string} id - Cooking session ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Cooking session
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT cs.id, cs.recipe_id as "recipeId", cs.member_id as "memberId", 
               cs.household_id as "householdId", cs.redis_key as "redisKey", cs.status,
               cs.current_step as "currentStep", cs.messages, cs.start_time as "startTime", 
               cs.end_time as "endTime", cs.feedback, cs.rating,
               cs.created_at as "createdAt", cs.updated_at as "updatedAt", cs.tenant_id as "tenantId",
               r.title as "recipeTitle", r.image_url as "recipeImageUrl"
        FROM cooking_sessions cs
        JOIN recipes r ON cs.recipe_id = r.id
        WHERE cs.id = $1 AND cs.tenant_id = $2
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const session = result.rows[0];
      
      // Format the session data
      return {
        ...session,
        messages: typeof session.messages === 'string' 
          ? JSON.parse(session.messages) 
          : session.messages,
        feedback: typeof session.feedback === 'string'
          ? JSON.parse(session.feedback)
          : session.feedback,
        recipe: {
          id: session.recipeId,
          title: session.recipeTitle,
          imageUrl: session.recipeImageUrl
        }
      };
    } catch (error) {
      logger.error(`Error getting cooking session ${id}:`, error);
      throw new Error(`Failed to get cooking session: ${error.message}`);
    }
  }

  /**
   * Get active cooking sessions by member ID
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Active cooking sessions
   */
  static async getActiveSessions(memberId, tenantId) {
    try {
      const query = `
        SELECT cs.id, cs.recipe_id as "recipeId", cs.member_id as "memberId", 
               cs.household_id as "householdId", cs.status, cs.current_step as "currentStep", 
               cs.start_time as "startTime", cs.end_time as "endTime",
               cs.created_at as "createdAt", cs.updated_at as "updatedAt",
               r.title as "recipeTitle", r.image_url as "recipeImageUrl"
        FROM cooking_sessions cs
        JOIN recipes r ON cs.recipe_id = r.id
        WHERE cs.member_id = $1 AND cs.tenant_id = $2 AND cs.status = 'active'
        ORDER BY cs.start_time DESC
      `;
      
      const values = [memberId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.map(session => ({
        ...session,
        recipe: {
          id: session.recipeId,
          title: session.recipeTitle,
          imageUrl: session.recipeImageUrl
        }
      }));
    } catch (error) {
      logger.error(`Error getting active cooking sessions for member ${memberId}:`, error);
      throw new Error(`Failed to get active cooking sessions: ${error.message}`);
    }
  }

  /**
   * Update a cooking session
   * @param {string} id - Cooking session ID
   * @param {Object} data - Updated cooking session data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated cooking session
   */
  static async update(id, data, tenantId) {
    const {
      status,
      currentStep,
      messages,
      endTime,
      feedback,
      rating
    } = data;
    
    // Build the SET clause and values array for the query
    const updateFields = [];
    const values = [id, tenantId];
    let valueIndex = 3;
    
    if (status !== undefined) {
      updateFields.push(`status = $${valueIndex++}`);
      values.push(status);
    }
    
    if (currentStep !== undefined) {
      updateFields.push(`current_step = $${valueIndex++}`);
      values.push(currentStep);
    }
    
    if (messages !== undefined) {
      updateFields.push(`messages = $${valueIndex++}`);
      values.push(JSON.stringify(messages));
    }
    
    if (endTime !== undefined) {
      updateFields.push(`end_time = $${valueIndex++}`);
      values.push(endTime);
    }
    
    if (feedback !== undefined) {
      updateFields.push(`feedback = $${valueIndex++}`);
      values.push(JSON.stringify(feedback));
    }
    
    if (rating !== undefined) {
      updateFields.push(`rating = $${valueIndex++}`);
      values.push(rating);
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = $${valueIndex++}`);
    values.push(new Date());
    
    // If no fields to update, return the existing session
    if (updateFields.length === 0) {
      return this.getById(id, tenantId);
    }
    
    try {
      const query = `
        UPDATE cooking_sessions
        SET ${updateFields.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, recipe_id as "recipeId", member_id as "memberId", 
                 household_id as "householdId", redis_key as "redisKey", status,
                 current_step as "currentStep", messages, start_time as "startTime", 
                 end_time as "endTime", feedback, rating,
                 created_at as "createdAt", updated_at as "updatedAt", tenant_id as "tenantId"
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Cooking session not found: ${id}`);
      }
      
      const session = result.rows[0];
      
      // Format the session data
      return {
        ...session,
        messages: typeof session.messages === 'string' 
          ? JSON.parse(session.messages) 
          : session.messages,
        feedback: typeof session.feedback === 'string'
          ? JSON.parse(session.feedback)
          : session.feedback
      };
    } catch (error) {
      logger.error(`Error updating cooking session ${id}:`, error);
      throw new Error(`Failed to update cooking session: ${error.message}`);
    }
  }

  /**
   * End a cooking session
   * @param {string} id - Cooking session ID
   * @param {Object} data - End session data
   * @param {number} data.rating - Recipe rating (1-5)
   * @param {Object} data.feedback - Feedback data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Ended cooking session
   */
  static async endSession(id, data, tenantId) {
    const { rating, feedback } = data;
    
    try {
      // Get Redis key for the session
      const sessionQuery = `
        SELECT redis_key FROM cooking_sessions
        WHERE id = $1 AND tenant_id = $2
      `;
      const sessionResult = await pool.query(sessionQuery, [id, tenantId]);
      
      if (sessionResult.rows.length === 0) {
        throw new Error(`Cooking session not found: ${id}`);
      }
      
      const redisKey = sessionResult.rows[0].redis_key;
      
      // Get session data from Redis if available
      let redisData = null;
      if (redisKey) {
        const redisSession = await redisClient.get(redisKey);
        if (redisSession) {
          redisData = JSON.parse(redisSession);
        }
      }
      
      // Update the session in database
      const updateData = {
        status: 'completed',
        endTime: new Date(),
        rating,
        feedback
      };
      
      // If we have Redis data, update the messages
      if (redisData && redisData.messages) {
        updateData.messages = redisData.messages;
        updateData.currentStep = redisData.currentStep || 0;
      }
      
      // Update the session
      const updatedSession = await this.update(id, updateData, tenantId);
      
      return updatedSession;
    } catch (error) {
      logger.error(`Error ending cooking session ${id}:`, error);
      throw new Error(`Failed to end cooking session: ${error.message}`);
    }
  }

  /**
   * Sync a cooking session with Redis data
   * @param {string} id - Cooking session ID
   * @param {string} redisKey - Redis key
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Synced cooking session
   */
  static async syncWithRedis(id, redisKey, tenantId) {
    try {
      // Get session data from Redis
      const redisData = await redisClient.get(redisKey);
      if (!redisData) {
        logger.warn(`Redis data not found for key: ${redisKey}`);
        return this.getById(id, tenantId);
      }
      
      const parsedData = JSON.parse(redisData);
      
      // Update the session with Redis data
      const updateData = {
        messages: parsedData.messages,
        currentStep: parsedData.currentStep || 0
      };
      
      // Update the session
      const updatedSession = await this.update(id, updateData, tenantId);
      
      return updatedSession;
    } catch (error) {
      logger.error(`Error syncing cooking session ${id} with Redis:`, error);
      throw new Error(`Failed to sync cooking session: ${error.message}`);
    }
  }

  /**
   * Delete a cooking session
   * @param {string} id - Cooking session ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM cooking_sessions
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const result = await pool.query(query, [id, tenantId]);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting cooking session ${id}:`, error);
      throw new Error(`Failed to delete cooking session: ${error.message}`);
    }
  }
}

module.exports = CookingSession; 