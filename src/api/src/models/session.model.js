const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Session model for managing user sessions
 */
class Session {
  constructor(db) {
    this.db = db;
    this.tableName = 'sessions';
  }

  /**
   * Create a new session
   * @param {Object} sessionData - Session data
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Created session
   */
  async create(sessionData, tenantId) {
    try {
      const { userId, token, deviceInfo, ipAddress, userAgent, expiresAt } = sessionData;
      
      // Hash token for storage
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const now = new Date();
      
      const session = {
        user_id: userId,
        token: token, // Store the token directly for now
        token_hash: tokenHash,
        device_info: deviceInfo,
        ip_address: ipAddress,
        user_agent: userAgent,
        tenant_id: tenantId || 'default',
        expires_at: expiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
        is_active: true,
        last_activity_at: now,
        created_at: now,
        updated_at: now
      };
      
      const [insertedId] = await this.db(this.tableName).insert(session).returning('id');
      
      return { ...session, id: insertedId, token }; // Include original token in response
    } catch (error) {
      logger.error(`Error creating session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find session by ID
   * @param {string} id - Session ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Session
   */
  async findById(id, tenantId) {
    try {
      return this.db(this.tableName)
        .where({ id, tenant_id: tenantId || 'default' })
        .first();
    } catch (error) {
      logger.error(`Error finding session by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find session by token
   * @param {string} token - Session token
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Session
   */
  async findByToken(token, tenantId) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      return this.db(this.tableName)
        .where({ 
          token: token, // Check both token and hash for now
          tenant_id: tenantId || 'default',
          is_active: true
        })
        .orWhere({
          token_hash: tokenHash,
          tenant_id: tenantId || 'default',
          is_active: true
        })
        .andWhere('expires_at', '>', new Date())
        .first();
    } catch (error) {
      logger.error(`Error finding session by token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active sessions for a user
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Array} Sessions
   */
  async getActiveSessionsForUser(userId, tenantId) {
    try {
      return this.db(this.tableName)
        .where({ 
          user_id: userId,
          tenant_id: tenantId || 'default',
          is_active: true
        })
        .andWhere('expires_at', '>', new Date())
        .select('id', 'device_info', 'ip_address', 'user_agent', 'last_activity_at', 'created_at');
    } catch (error) {
      logger.error(`Error getting active sessions for user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update session activity
   * @param {string} id - Session ID
   * @param {string} tenantId - Tenant ID
   * @returns {boolean} Success
   */
  async updateActivity(id, tenantId) {
    try {
      await this.db(this.tableName)
        .where({ id, tenant_id: tenantId || 'default' })
        .update({
          last_activity_at: new Date(),
          updated_at: new Date()
        });
      
      return true;
    } catch (error) {
      logger.error(`Error updating session activity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deactivate session
   * @param {string} id - Session ID
   * @param {string} tenantId - Tenant ID
   * @returns {boolean} Success
   */
  async deactivate(id, tenantId) {
    try {
      await this.db(this.tableName)
        .where({ id, tenant_id: tenantId || 'default' })
        .update({
          is_active: false,
          updated_at: new Date()
        });
      
      return true;
    } catch (error) {
      logger.error(`Error deactivating session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deactivate all sessions for a user
   * @param {string} userId - User ID
   * @param {string} exceptSessionId - Session ID to exclude
   * @param {string} tenantId - Tenant ID
   * @returns {number} Number of deactivated sessions
   */
  async deactivateAllForUser(userId, exceptSessionId, tenantId) {
    try {
      const query = this.db(this.tableName)
        .where({ 
          user_id: userId,
          tenant_id: tenantId || 'default',
          is_active: true
        });
      
      if (exceptSessionId) {
        query.whereNot('id', exceptSessionId);
      }
      
      const result = await query.update({
        is_active: false,
        updated_at: new Date()
      });
      
      return result;
    } catch (error) {
      logger.error(`Error deactivating all sessions for user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   * @returns {number} Number of deleted sessions
   */
  async cleanupExpiredSessions() {
    try {
      return this.db(this.tableName)
        .where('expires_at', '<', new Date())
        .update({
          is_active: false,
          updated_at: new Date()
        });
    } catch (error) {
      logger.error(`Error cleaning up expired sessions: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Session; 