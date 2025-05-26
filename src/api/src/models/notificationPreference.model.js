const db = require('../database');
const logger = require('../utils/logger');

/**
 * NotificationPreference model
 */
class NotificationPreference {
  /**
   * Create a new notification preference
   * @param {Object} data - Notification preference data
   * @param {string} data.entityType - Entity type ('household', 'member')
   * @param {string} data.entityId - Entity ID
   * @param {string} data.notificationType - Notification type
   * @param {Object} data.channels - Channel preferences
   * @param {boolean} data.enabled - Whether notifications are enabled
   * @param {string} data.quietHoursStart - Quiet hours start time (optional)
   * @param {string} data.quietHoursEnd - Quiet hours end time (optional)
   * @param {number} data.frequencyLimit - Maximum notifications per day (optional)
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created notification preference
   */
  static async create(data) {
    try {
      const {
        entityType,
        entityId,
        notificationType,
        channels,
        enabled = true,
        quietHoursStart = null,
        quietHoursEnd = null,
        frequencyLimit = null,
        tenantId
      } = data;

      const result = await db.query(
        `INSERT INTO notification_preferences 
        (entity_type, entity_id, notification_type, channels, enabled, 
        quiet_hours_start, quiet_hours_end, frequency_limit, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [entityType, entityId, notificationType, channels, enabled, 
          quietHoursStart, quietHoursEnd, frequencyLimit, tenantId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification preference:', error);
      throw error;
    }
  }

  /**
   * Get a notification preference by ID
   * @param {string} id - Notification preference ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Notification preference
   */
  static async getById(id, tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_preferences WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting notification preference by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a notification preference by entity and type
   * @param {string} entityType - Entity type ('household', 'member')
   * @param {string} entityId - Entity ID
   * @param {string} notificationType - Notification type
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Notification preference
   */
  static async getByEntityAndType(entityType, entityId, notificationType, tenantId) {
    try {
      const result = await db.query(
        `SELECT * FROM notification_preferences 
        WHERE entity_type = $1 AND entity_id = $2 AND notification_type = $3 AND tenant_id = $4`,
        [entityType, entityId, notificationType, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting notification preference for ${entityType}:${entityId} and type ${notificationType}:`, error);
      throw error;
    }
  }

  /**
   * Update a notification preference
   * @param {string} id - Notification preference ID
   * @param {Object} data - Data to update
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification preference
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
        `UPDATE notification_preferences 
        SET ${updateFields.join(', ')} 
        WHERE id = $${valueIndex} AND tenant_id = $${valueIndex + 1}
        RETURNING *`,
        values
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error updating notification preference ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a notification preference
   * @param {string} id - Notification preference ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id, tenantId) {
    try {
      const result = await db.query(
        'DELETE FROM notification_preferences WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [id, tenantId]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting notification preference ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get notification preferences by entity
   * @param {string} entityType - Entity type ('household', 'member')
   * @param {string} entityId - Entity ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Notification preferences
   */
  static async getByEntity(entityType, entityId, tenantId) {
    try {
      const result = await db.query(
        `SELECT * FROM notification_preferences 
        WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3`,
        [entityType, entityId, tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting notification preferences for ${entityType}:${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Get notification preferences by notification type
   * @param {string} notificationType - Notification type
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Notification preferences
   */
  static async getByNotificationType(notificationType, tenantId) {
    try {
      const result = await db.query(
        `SELECT * FROM notification_preferences 
        WHERE notification_type = $1 AND tenant_id = $2`,
        [notificationType, tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting notification preferences for type ${notificationType}:`, error);
      throw error;
    }
  }

  /**
   * Enable or disable notifications for an entity
   * @param {string} entityType - Entity type ('household', 'member')
   * @param {string} entityId - Entity ID
   * @param {boolean} enabled - Whether notifications are enabled
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Number of updated records
   */
  static async setEnabled(entityType, entityId, enabled, tenantId) {
    try {
      const result = await db.query(
        `UPDATE notification_preferences 
        SET enabled = $1, updated_at = NOW() 
        WHERE entity_type = $2 AND entity_id = $3 AND tenant_id = $4
        RETURNING id`,
        [enabled, entityType, entityId, tenantId]
      );

      return result.rowCount;
    } catch (error) {
      logger.error(`Error setting enabled status for ${entityType}:${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Check if notifications are enabled for an entity and type
   * @param {string} entityType - Entity type ('household', 'member')
   * @param {string} entityId - Entity ID
   * @param {string} notificationType - Notification type
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if enabled
   */
  static async isEnabled(entityType, entityId, notificationType, tenantId) {
    try {
      const preference = await this.getByEntityAndType(entityType, entityId, notificationType, tenantId);
      
      // If no preference exists, default to enabled
      if (!preference) {
        return true;
      }

      return preference.enabled;
    } catch (error) {
      logger.error(`Error checking if notifications are enabled for ${entityType}:${entityId} and type ${notificationType}:`, error);
      throw error;
    }
  }

  /**
   * Get channel preferences for an entity and type
   * @param {string} entityType - Entity type ('household', 'member')
   * @param {string} entityId - Entity ID
   * @param {string} notificationType - Notification type
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Channel preferences
   */
  static async getChannelPreferences(entityType, entityId, notificationType, tenantId) {
    try {
      const preference = await this.getByEntityAndType(entityType, entityId, notificationType, tenantId);
      
      // If no preference exists, return default (all channels enabled)
      if (!preference) {
        return {};
      }

      return preference.channels;
    } catch (error) {
      logger.error(`Error getting channel preferences for ${entityType}:${entityId} and type ${notificationType}:`, error);
      throw error;
    }
  }

  /**
   * Check if notification should be sent based on quiet hours
   * @param {Object} preference - Notification preference
   * @returns {boolean} True if notification should be sent
   */
  static isWithinQuietHours(preference) {
    // If no quiet hours set, always allow
    if (!preference.quiet_hours_start || !preference.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Parse quiet hours times (format: HH:MM:SS)
    const startParts = preference.quiet_hours_start.split(':');
    const endParts = preference.quiet_hours_end.split(':');
    
    const startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
    const endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);

    // Check if current time is within quiet hours
    if (startMinutes <= endMinutes) {
      // Normal case: start time is before end time
      return currentTime >= startMinutes && currentTime <= endMinutes;
    } else {
      // Overnight case: start time is after end time (e.g., 22:00 to 06:00)
      return currentTime >= startMinutes || currentTime <= endMinutes;
    }
  }
}

module.exports = NotificationPreference;
