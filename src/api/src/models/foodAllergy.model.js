const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * FoodAllergy model
 */
class FoodAllergy {
  /**
   * Create a new food allergy
   * @param {Object} data - Food allergy data
   * @param {string} data.memberId - Member ID
   * @param {string} data.ingredientId - Ingredient ID
   * @param {string} data.severity - Severity (mild, moderate, severe)
   * @param {string} data.notes - Notes
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created food allergy
   */
  static async create(data) {
    const { memberId, ingredientId, severity, notes, tenantId } = data;
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO food_allergies (id, member_id, ingredient_id, severity, notes, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, member_id, ingredient_id, severity, notes, created_at, updated_at, tenant_id
      `;
      const values = [id, memberId, ingredientId, severity, notes, createdAt, updatedAt, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating food allergy:', error);
      throw new Error(`Failed to create food allergy: ${error.message}`);
    }
  }

  /**
   * Get a food allergy by ID
   * @param {string} id - Food allergy ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Food allergy
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT fa.id, fa.member_id, fa.ingredient_id, fa.severity, fa.notes, fa.created_at, fa.updated_at, fa.tenant_id,
               i.name as ingredient_name, i.category as ingredient_category
        FROM food_allergies fa
        JOIN ingredients i ON fa.ingredient_id = i.id
        WHERE fa.id = $1 AND fa.tenant_id = $2
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting food allergy ${id}:`, error);
      throw new Error(`Failed to get food allergy: ${error.message}`);
    }
  }

  /**
   * Get all food allergies for a member
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Food allergies
   */
  static async getByMemberId(memberId, tenantId) {
    try {
      const query = `
        SELECT fa.id, fa.member_id, fa.ingredient_id, fa.severity, fa.notes, fa.created_at, fa.updated_at, fa.tenant_id,
               i.name as ingredient_name, i.category as ingredient_category
        FROM food_allergies fa
        JOIN ingredients i ON fa.ingredient_id = i.id
        WHERE fa.member_id = $1 AND fa.tenant_id = $2
        ORDER BY i.name
      `;
      const values = [memberId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting food allergies for member ${memberId}:`, error);
      throw new Error(`Failed to get food allergies: ${error.message}`);
    }
  }

  /**
   * Update a food allergy
   * @param {string} id - Food allergy ID
   * @param {Object} data - Food allergy data
   * @param {string} data.severity - Severity (mild, moderate, severe)
   * @param {string} data.notes - Notes
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated food allergy
   */
  static async update(id, data, tenantId) {
    const { severity, notes } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE food_allergies
        SET severity = COALESCE($1, severity),
            notes = COALESCE($2, notes),
            updated_at = $3
        WHERE id = $4 AND tenant_id = $5
        RETURNING id, member_id, ingredient_id, severity, notes, created_at, updated_at, tenant_id
      `;
      const values = [severity, notes, updatedAt, id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating food allergy ${id}:`, error);
      throw new Error(`Failed to update food allergy: ${error.message}`);
    }
  }

  /**
   * Delete a food allergy
   * @param {string} id - Food allergy ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM food_allergies
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting food allergy ${id}:`, error);
      throw new Error(`Failed to delete food allergy: ${error.message}`);
    }
  }
}

module.exports = FoodAllergy;
