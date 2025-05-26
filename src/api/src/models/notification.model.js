const db = require('../database');
const logger = require('../utils/logger');

/**
 * Notification model
 */
class Notification {
  /**
   * Create a new notification
   * @param {Object} data - Notification data
   * @param {string} data.type - Notification type
   * @param {string} data.title - Notification title
   * @param {string} data.body - Notification body
   * @param {Object} data.data - Additional notification data (optional)
   * @param {string} data.status - Notification status (default: 'pending')
   * @param {Date} data.scheduledFor - When to deliver the notification (optional)
   * @param {Date} data.expiresAt - When the notification expires (optional)
   * @param {string} data.priority - Notification priority (default: 'medium')
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created notification
   */
  static async create(data) {
    try {
      const {
        type,
        title,
        body,
        data: notificationData = {},
        status = 'pending',
        scheduledFor = null,
        expiresAt = null,
        priority = 'medium',
        tenantId
      } = data;

      const result = await db.query(
        `INSERT INTO notifications 
        (type, title, body, data, status, scheduled_for, expires_at, priority, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [type, title, body, notificationData, status, scheduledFor, expiresAt, priority, tenantId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get a notification by ID
   * @param {string} id - Notification ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Notification
   */
  static async getById(id, tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notifications WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting notification by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a notification
   * @param {string} id - Notification ID
   * @param {Object} data - Data to update
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification
   */
  static async update(id, data, tenantId) {
    try {
      const updateFields = [];
      const values = [];
      let valueIndex = 1;

      // Build dynamic update query
      Object.entries(data).forEach(([key, value]) => {
        // Convert camelCase to snake_case for database
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updateFields.push(`${dbKey} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      });

      values.push(id, tenantId);

      const result = await db.query(
        `UPDATE notifications 
        SET ${updateFields.join(', ')} 
        WHERE id = $${valueIndex} AND tenant_id = $${valueIndex + 1}
        RETURNING *`,
        values
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error updating notification ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param {string} id - Notification ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id, tenantId) {
    try {
      const result = await db.query(
        'DELETE FROM notifications WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [id, tenantId]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting notification ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get notifications by type
   * @param {string} type - Notification type
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Notifications
   */
  static async getByType(type, tenantId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const result = await db.query(
        `SELECT * FROM notifications 
        WHERE type = $1 AND tenant_id = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4`,
        [type, tenantId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting notifications by type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Get notifications by status
   * @param {string} status - Notification status
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Notifications
   */
  static async getByStatus(status, tenantId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const result = await db.query(
        `SELECT * FROM notifications 
        WHERE status = $1 AND tenant_id = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4`,
        [status, tenantId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting notifications by status ${status}:`, error);
      throw error;
    }
  }

  /**
   * Get scheduled notifications that are due
   * @param {string} tenantId - Tenant ID
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Due notifications
   */
  static async getDueNotifications(tenantId, limit = 50) {
    try {
      const now = new Date();

      const result = await db.query(
        `SELECT * FROM notifications 
        WHERE status = 'pending' 
        AND scheduled_for <= $1 
        AND (expires_at IS NULL OR expires_at > $1)
        AND tenant_id = $2
        ORDER BY priority DESC, scheduled_for ASC
        LIMIT $3`,
        [now, tenantId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting due notifications:', error);
      throw error;
    }
  }

  /**
   * Count notifications by type
   * @param {string} type - Notification type
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Count
   */
  static async countByType(type, tenantId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) FROM notifications WHERE type = $1 AND tenant_id = $2',
        [type, tenantId]
      );

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error(`Error counting notifications by type ${type}:`, error);
      throw error;
    }
  }
}

module.exports = Notification;
