const db = require('../database');
const logger = require('../utils/logger');

/**
 * NotificationDelivery model
 */
class NotificationDelivery {
  /**
   * Create a new notification delivery
   * @param {Object} data - Notification delivery data
   * @param {string} data.notificationId - Notification ID
   * @param {string} data.recipientId - Notification recipient ID
   * @param {string} data.channelId - Notification channel ID
   * @param {string} data.status - Delivery status (default: 'pending')
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created notification delivery
   */
  static async create(data) {
    try {
      const {
        notificationId,
        recipientId,
        channelId,
        status = 'pending',
        tenantId
      } = data;

      const result = await db.query(
        `INSERT INTO notification_deliveries 
        (notification_id, recipient_id, channel_id, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [notificationId, recipientId, channelId, status, tenantId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification delivery:', error);
      throw error;
    }
  }

  /**
   * Get a notification delivery by ID
   * @param {string} id - Notification delivery ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Notification delivery
   */
  static async getById(id, tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_deliveries WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting notification delivery by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a notification delivery
   * @param {string} id - Notification delivery ID
   * @param {Object} data - Data to update
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification delivery
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
        `UPDATE notification_deliveries 
        SET ${updateFields.join(', ')} 
        WHERE id = $${valueIndex} AND tenant_id = $${valueIndex + 1}
        RETURNING *`,
        values
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error updating notification delivery ${id}:`, error);
      throw error;
    }
  }

  /**
   * Mark a notification delivery as delivered
   * @param {string} id - Notification delivery ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification delivery
   */
  static async markAsDelivered(id, tenantId) {
    try {
      const result = await db.query(
        `UPDATE notification_deliveries 
        SET status = 'delivered', delivered_at = NOW(), updated_at = NOW() 
        WHERE id = $1 AND tenant_id = $2
        RETURNING *`,
        [id, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error marking notification delivery ${id} as delivered:`, error);
      throw error;
    }
  }

  /**
   * Mark a notification delivery as failed
   * @param {string} id - Notification delivery ID
   * @param {string} errorMessage - Error message
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification delivery
   */
  static async markAsFailed(id, errorMessage, tenantId) {
    try {
      const result = await db.query(
        `UPDATE notification_deliveries 
        SET status = 'failed', error_message = $1, updated_at = NOW() 
        WHERE id = $2 AND tenant_id = $3
        RETURNING *`,
        [errorMessage, id, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error marking notification delivery ${id} as failed:`, error);
      throw error;
    }
  }

  /**
   * Increment retry count and set next retry time
   * @param {string} id - Notification delivery ID
   * @param {Date} nextRetryAt - Next retry time
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification delivery
   */
  static async incrementRetry(id, nextRetryAt, tenantId) {
    try {
      const result = await db.query(
        `UPDATE notification_deliveries 
        SET retry_count = retry_count + 1, next_retry_at = $1, updated_at = NOW() 
        WHERE id = $2 AND tenant_id = $3
        RETURNING *`,
        [nextRetryAt, id, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error incrementing retry count for notification delivery ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get notification deliveries by notification ID
   * @param {string} notificationId - Notification ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Notification deliveries
   */
  static async getByNotificationId(notificationId, tenantId) {
    try {
      const result = await db.query(
        `SELECT nd.*, nc.name as channel_name, nc.type as channel_type
        FROM notification_deliveries nd
        JOIN notification_channels nc ON nd.channel_id = nc.id
        WHERE nd.notification_id = $1 AND nd.tenant_id = $2`,
        [notificationId, tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting deliveries for notification ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * Get notification deliveries by recipient ID
   * @param {string} recipientId - Notification recipient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Notification deliveries
   */
  static async getByRecipientId(recipientId, tenantId) {
    try {
      const result = await db.query(
        `SELECT nd.*, nc.name as channel_name, nc.type as channel_type
        FROM notification_deliveries nd
        JOIN notification_channels nc ON nd.channel_id = nc.id
        WHERE nd.recipient_id = $1 AND nd.tenant_id = $2`,
        [recipientId, tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting deliveries for recipient ${recipientId}:`, error);
      throw error;
    }
  }

  /**
   * Get notification deliveries by channel ID
   * @param {string} channelId - Notification channel ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Notification deliveries
   */
  static async getByChannelId(channelId, tenantId) {
    try {
      const result = await db.query(
        `SELECT * FROM notification_deliveries 
        WHERE channel_id = $1 AND tenant_id = $2`,
        [channelId, tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting deliveries for channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Get notification deliveries by status
   * @param {string} status - Delivery status
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Notification deliveries
   */
  static async getByStatus(status, tenantId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const result = await db.query(
        `SELECT nd.*, n.type as notification_type, n.title, n.priority
        FROM notification_deliveries nd
        JOIN notifications n ON nd.notification_id = n.id
        WHERE nd.status = $1 AND nd.tenant_id = $2
        ORDER BY nd.created_at DESC
        LIMIT $3 OFFSET $4`,
        [status, tenantId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting deliveries by status ${status}:`, error);
      throw error;
    }
  }

  /**
   * Get pending deliveries that need to be retried
   * @param {string} tenantId - Tenant ID
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Pending deliveries
   */
  static async getPendingRetries(tenantId, limit = 50) {
    try {
      const now = new Date();

      const result = await db.query(
        `SELECT nd.*, n.type as notification_type, n.title, n.priority, nc.type as channel_type
        FROM notification_deliveries nd
        JOIN notifications n ON nd.notification_id = n.id
        JOIN notification_channels nc ON nd.channel_id = nc.id
        WHERE nd.status = 'pending' 
        AND nd.next_retry_at <= $1
        AND nd.tenant_id = $2
        ORDER BY n.priority DESC, nd.next_retry_at ASC
        LIMIT $3`,
        [now, tenantId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting pending retries:', error);
      throw error;
    }
  }

  /**
   * Count deliveries by status
   * @param {string} status - Delivery status
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Count
   */
  static async countByStatus(status, tenantId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) FROM notification_deliveries WHERE status = $1 AND tenant_id = $2',
        [status, tenantId]
      );

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error(`Error counting deliveries by status ${status}:`, error);
      throw error;
    }
  }
}

module.exports = NotificationDelivery;
