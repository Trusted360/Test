const db = require('../database');
const logger = require('../utils/logger');

/**
 * NotificationRecipient model
 */
class NotificationRecipient {
  /**
   * Create a new notification recipient
   * @param {Object} data - Notification recipient data
   * @param {string} data.notificationId - Notification ID
   * @param {string} data.recipientType - Recipient type ('household', 'member')
   * @param {string} data.recipientId - Recipient ID
   * @param {string} data.status - Status (default: 'pending')
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created notification recipient
   */
  static async create(data) {
    try {
      const {
        notificationId,
        recipientType,
        recipientId,
        status = 'pending',
        tenantId
      } = data;

      const result = await db.query(
        `INSERT INTO notification_recipients 
        (notification_id, recipient_type, recipient_id, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [notificationId, recipientType, recipientId, status, tenantId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification recipient:', error);
      throw error;
    }
  }

  /**
   * Get a notification recipient by ID
   * @param {string} id - Notification recipient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Notification recipient
   */
  static async getById(id, tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_recipients WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting notification recipient by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a notification recipient
   * @param {string} id - Notification recipient ID
   * @param {Object} data - Data to update
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification recipient
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

      // Add updated_at timestamp
      updateFields.push(`updated_at = NOW()`);

      values.push(id, tenantId);

      const result = await db.query(
        `UPDATE notification_recipients 
        SET ${updateFields.join(', ')} 
        WHERE id = $${valueIndex} AND tenant_id = $${valueIndex + 1}
        RETURNING *`,
        values
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error updating notification recipient ${id}:`, error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param {string} id - Notification recipient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification recipient
   */
  static async markAsRead(id, tenantId) {
    try {
      const result = await db.query(
        `UPDATE notification_recipients 
        SET status = 'read', read_at = NOW(), updated_at = NOW() 
        WHERE id = $1 AND tenant_id = $2
        RETURNING *`,
        [id, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error marking notification recipient ${id} as read:`, error);
      throw error;
    }
  }

  /**
   * Get notification recipients by notification ID
   * @param {string} notificationId - Notification ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Notification recipients
   */
  static async getByNotificationId(notificationId, tenantId) {
    try {
      const result = await db.query(
        `SELECT * FROM notification_recipients 
        WHERE notification_id = $1 AND tenant_id = $2`,
        [notificationId, tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting recipients for notification ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * Get notification recipients by recipient
   * @param {string} recipientType - Recipient type ('household', 'member')
   * @param {string} recipientId - Recipient ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Notification recipients
   */
  static async getByRecipient(recipientType, recipientId, tenantId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const result = await db.query(
        `SELECT nr.*, n.type, n.title, n.body, n.data, n.priority, n.created_at as notification_created_at
        FROM notification_recipients nr
        JOIN notifications n ON nr.notification_id = n.id
        WHERE nr.recipient_type = $1 
        AND nr.recipient_id = $2 
        AND nr.tenant_id = $3
        ORDER BY n.created_at DESC
        LIMIT $4 OFFSET $5`,
        [recipientType, recipientId, tenantId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting notifications for recipient ${recipientType}:${recipientId}:`, error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a recipient
   * @param {string} recipientType - Recipient type ('household', 'member')
   * @param {string} recipientId - Recipient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Unread count
   */
  static async getUnreadCount(recipientType, recipientId, tenantId) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) FROM notification_recipients 
        WHERE recipient_type = $1 
        AND recipient_id = $2 
        AND status = 'pending' 
        AND tenant_id = $3`,
        [recipientType, recipientId, tenantId]
      );

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error(`Error getting unread count for ${recipientType}:${recipientId}:`, error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a recipient
   * @param {string} recipientType - Recipient type ('household', 'member')
   * @param {string} recipientId - Recipient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Number of updated records
   */
  static async markAllAsRead(recipientType, recipientId, tenantId) {
    try {
      const result = await db.query(
        `UPDATE notification_recipients 
        SET status = 'read', read_at = NOW(), updated_at = NOW() 
        WHERE recipient_type = $1 
        AND recipient_id = $2 
        AND status = 'pending' 
        AND tenant_id = $3
        RETURNING id`,
        [recipientType, recipientId, tenantId]
      );

      return result.rowCount;
    } catch (error) {
      logger.error(`Error marking all notifications as read for ${recipientType}:${recipientId}:`, error);
      throw error;
    }
  }
}

module.exports = NotificationRecipient;
