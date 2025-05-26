const db = require('../database');
const logger = require('../utils/logger');

/**
 * NotificationChannel model
 */
class NotificationChannel {
  /**
   * Create a new notification channel
   * @param {Object} data - Notification channel data
   * @param {string} data.name - Channel name
   * @param {string} data.type - Channel type ('email', 'push', 'slack', 'telegram', 'in-app')
   * @param {Object} data.config - Channel configuration
   * @param {boolean} data.active - Whether the channel is active
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created notification channel
   */
  static async create(data) {
    try {
      const {
        name,
        type,
        config,
        active = true,
        tenantId
      } = data;

      const result = await db.query(
        `INSERT INTO notification_channels 
        (name, type, config, active, tenant_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [name, type, config, active, tenantId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification channel:', error);
      throw error;
    }
  }

  /**
   * Get a notification channel by ID
   * @param {string} id - Notification channel ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Notification channel
   */
  static async getById(id, tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_channels WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting notification channel by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a notification channel
   * @param {string} id - Notification channel ID
   * @param {Object} data - Data to update
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification channel
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
        `UPDATE notification_channels 
        SET ${updateFields.join(', ')} 
        WHERE id = $${valueIndex} AND tenant_id = $${valueIndex + 1}
        RETURNING *`,
        values
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error updating notification channel ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a notification channel
   * @param {string} id - Notification channel ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id, tenantId) {
    try {
      const result = await db.query(
        'DELETE FROM notification_channels WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [id, tenantId]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting notification channel ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all notification channels
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Notification channels
   */
  static async getAll(tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_channels WHERE tenant_id = $1 ORDER BY name',
        [tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting all notification channels:', error);
      throw error;
    }
  }

  /**
   * Get notification channels by type
   * @param {string} type - Channel type
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Notification channels
   */
  static async getByType(type, tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_channels WHERE type = $1 AND tenant_id = $2 AND active = true ORDER BY name',
        [type, tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting notification channels by type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Get active notification channels
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Active notification channels
   */
  static async getActive(tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_channels WHERE active = true AND tenant_id = $1 ORDER BY name',
        [tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting active notification channels:', error);
      throw error;
    }
  }

  /**
   * Check if a channel exists
   * @param {string} name - Channel name
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if exists
   */
  static async exists(name, tenantId) {
    try {
      const result = await db.query(
        'SELECT id FROM notification_channels WHERE name = $1 AND tenant_id = $2',
        [name, tenantId]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error checking if notification channel ${name} exists:`, error);
      throw error;
    }
  }
}

module.exports = NotificationChannel;
