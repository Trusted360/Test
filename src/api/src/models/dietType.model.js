const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * DietType model
 */
class DietType {
  /**
   * Create a new diet type
   * @param {Object} data - Diet type data
   * @param {string} data.name - Diet type name
   * @param {string} data.description - Diet type description
   * @param {Object} data.restrictions - Diet type restrictions as JSON
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created diet type
   */
  static async create(data) {
    const { name, description, restrictions, tenantId } = data;
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO diet_types (id, name, description, restrictions, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, description, restrictions, created_at, updated_at, tenant_id
      `;
      const values = [id, name, description, restrictions, createdAt, updatedAt, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating diet type:', error);
      throw new Error(`Failed to create diet type: ${error.message}`);
    }
  }

  /**
   * Get a diet type by ID
   * @param {string} id - Diet type ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Diet type
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, name, description, restrictions, created_at, updated_at, tenant_id
        FROM diet_types
        WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting diet type ${id}:`, error);
      throw new Error(`Failed to get diet type: ${error.message}`);
    }
  }

  /**
   * Get all diet types
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Diet types
   */
  static async getAll(tenantId) {
    try {
      const query = `
        SELECT id, name, description, restrictions, created_at, updated_at, tenant_id
        FROM diet_types
        WHERE tenant_id = $1 OR tenant_id IS NULL
        ORDER BY name
      `;
      const values = [tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting all diet types:', error);
      throw new Error(`Failed to get diet types: ${error.message}`);
    }
  }

  /**
   * Update a diet type
   * @param {string} id - Diet type ID
   * @param {Object} data - Diet type data
   * @param {string} data.name - Diet type name
   * @param {string} data.description - Diet type description
   * @param {Object} data.restrictions - Diet type restrictions as JSON
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated diet type
   */
  static async update(id, data, tenantId) {
    const { name, description, restrictions } = data;
    const updatedAt = new Date();

    try {
      // Check if this is a system diet type (tenant_id is NULL)
      const checkQuery = `
        SELECT tenant_id FROM diet_types WHERE id = $1
      `;
      const checkResult = await pool.query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        return null;
      }
      
      // If this is a system diet type, create a tenant-specific copy instead of updating
      if (checkResult.rows[0].tenant_id === null) {
        logger.info(`Creating tenant-specific copy of system diet type ${id}`);
        
        // Get the system diet type
        const systemDietType = await this.getById(id, tenantId);
        
        // Create a tenant-specific copy with the updates
        return await this.create({
          name: name || systemDietType.name,
          description: description || systemDietType.description,
          restrictions: restrictions || systemDietType.restrictions,
          tenantId
        });
      }
      
      // Otherwise, update the tenant-specific diet type
      const query = `
        UPDATE diet_types
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            restrictions = COALESCE($3, restrictions),
            updated_at = $4
        WHERE id = $5 AND tenant_id = $6
        RETURNING id, name, description, restrictions, created_at, updated_at, tenant_id
      `;
      const values = [name, description, restrictions, updatedAt, id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating diet type ${id}:`, error);
      throw new Error(`Failed to update diet type: ${error.message}`);
    }
  }

  /**
   * Delete a diet type
   * @param {string} id - Diet type ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      // Check if this is a system diet type (tenant_id is NULL)
      const checkQuery = `
        SELECT tenant_id FROM diet_types WHERE id = $1
      `;
      const checkResult = await pool.query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        return false;
      }
      
      // Cannot delete system diet types
      if (checkResult.rows[0].tenant_id === null) {
        throw new Error('Cannot delete system diet types');
      }
      
      const query = `
        DELETE FROM diet_types
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting diet type ${id}:`, error);
      throw new Error(`Failed to delete diet type: ${error.message}`);
    }
  }
}

module.exports = DietType;
