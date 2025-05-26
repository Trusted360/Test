const db = require('../database');
const logger = require('../utils/logger');

/**
 * NotificationTemplate model
 */
class NotificationTemplate {
  /**
   * Create a new notification template
   * @param {Object} data - Notification template data
   * @param {string} data.name - Template name
   * @param {string} data.type - Template type
   * @param {string} data.titleTemplate - Title template
   * @param {string} data.bodyTemplate - Body template
   * @param {Object} data.dataSchema - Data schema (optional)
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created notification template
   */
  static async create(data) {
    try {
      const {
        name,
        type,
        titleTemplate,
        bodyTemplate,
        dataSchema = {},
        tenantId
      } = data;

      const result = await db.query(
        `INSERT INTO notification_templates 
        (name, type, title_template, body_template, data_schema, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [name, type, titleTemplate, bodyTemplate, dataSchema, tenantId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification template:', error);
      throw error;
    }
  }

  /**
   * Get a notification template by ID
   * @param {string} id - Notification template ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Notification template
   */
  static async getById(id, tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_templates WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting notification template by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a notification template by name
   * @param {string} name - Template name
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Notification template
   */
  static async getByName(name, tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_templates WHERE name = $1 AND tenant_id = $2',
        [name, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting notification template by name ${name}:`, error);
      throw error;
    }
  }

  /**
   * Update a notification template
   * @param {string} id - Notification template ID
   * @param {Object} data - Data to update
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification template
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
        `UPDATE notification_templates 
        SET ${updateFields.join(', ')} 
        WHERE id = $${valueIndex} AND tenant_id = $${valueIndex + 1}
        RETURNING *`,
        values
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error updating notification template ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a notification template
   * @param {string} id - Notification template ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id, tenantId) {
    try {
      const result = await db.query(
        'DELETE FROM notification_templates WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [id, tenantId]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting notification template ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all notification templates
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Notification templates
   */
  static async getAll(tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_templates WHERE tenant_id = $1 ORDER BY name',
        [tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting all notification templates:', error);
      throw error;
    }
  }

  /**
   * Get notification templates by type
   * @param {string} type - Template type
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Notification templates
   */
  static async getByType(type, tenantId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_templates WHERE type = $1 AND tenant_id = $2 ORDER BY name',
        [type, tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting notification templates by type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Check if a template exists
   * @param {string} name - Template name
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if exists
   */
  static async exists(name, tenantId) {
    try {
      const result = await db.query(
        'SELECT id FROM notification_templates WHERE name = $1 AND tenant_id = $2',
        [name, tenantId]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error checking if notification template ${name} exists:`, error);
      throw error;
    }
  }

  /**
   * Render a template with data
   * @param {Object} template - Template object
   * @param {Object} data - Data to render the template with
   * @returns {Object} Rendered notification
   */
  static renderTemplate(template, data) {
    try {
      // Simple template rendering using string replacement
      // In a real implementation, you might use a more sophisticated template engine
      let title = template.title_template;
      let body = template.body_template;

      // Replace placeholders with data
      Object.entries(data).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        title = title.replace(placeholder, value);
        body = body.replace(placeholder, value);
      });

      return {
        title,
        body,
        data
      };
    } catch (error) {
      logger.error(`Error rendering template ${template.name}:`, error);
      throw error;
    }
  }
}

module.exports = NotificationTemplate;
