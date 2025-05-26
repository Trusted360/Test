const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * FoodPreference model
 */
class FoodPreference {
  /**
   * Create a new food preference
   * @param {Object} data - Food preference data
   * @param {string} data.memberId - Member ID
   * @param {string} data.ingredientId - Ingredient ID
   * @param {number} data.preferenceLevel - Preference level (-3 to +3)
   * @param {string} data.notes - Notes
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created food preference
   */
  static async create(data) {
    const { memberId, ingredientId, preferenceLevel, notes, tenantId } = data;
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO food_preferences (id, member_id, ingredient_id, preference_level, notes, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, member_id, ingredient_id, preference_level, notes, created_at, updated_at, tenant_id
      `;
      const values = [id, memberId, ingredientId, preferenceLevel, notes, createdAt, updatedAt, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating food preference:', error);
      throw new Error(`Failed to create food preference: ${error.message}`);
    }
  }

  /**
   * Get a food preference by ID
   * @param {string} id - Food preference ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Food preference
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT fp.id, fp.member_id, fp.ingredient_id, fp.preference_level, fp.notes, fp.created_at, fp.updated_at, fp.tenant_id,
               i.name as ingredient_name, i.category as ingredient_category
        FROM food_preferences fp
        JOIN ingredients i ON fp.ingredient_id = i.id
        WHERE fp.id = $1 AND fp.tenant_id = $2
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting food preference ${id}:`, error);
      throw new Error(`Failed to get food preference: ${error.message}`);
    }
  }

  /**
   * Get all food preferences for a member
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Food preferences
   */
  static async getByMemberId(memberId, tenantId) {
    try {
      const query = `
        SELECT fp.id, fp.member_id, fp.ingredient_id, fp.preference_level, fp.notes, fp.created_at, fp.updated_at, fp.tenant_id,
               i.name as ingredient_name, i.category as ingredient_category
        FROM food_preferences fp
        JOIN ingredients i ON fp.ingredient_id = i.id
        WHERE fp.member_id = $1 AND fp.tenant_id = $2
        ORDER BY fp.preference_level DESC, i.name
      `;
      const values = [memberId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting food preferences for member ${memberId}:`, error);
      throw new Error(`Failed to get food preferences: ${error.message}`);
    }
  }

  /**
   * Get liked and disliked ingredients for a member
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Liked and disliked ingredients
   */
  static async getLikesAndDislikes(memberId, tenantId) {
    try {
      const query = `
        SELECT 
          ARRAY_AGG(i.name) FILTER (WHERE fp.preference_level > 0) as likes,
          ARRAY_AGG(i.name) FILTER (WHERE fp.preference_level < 0) as dislikes
        FROM food_preferences fp
        JOIN ingredients i ON fp.ingredient_id = i.id
        WHERE fp.member_id = $1 AND fp.tenant_id = $2
      `;
      const values = [memberId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows[0] || { likes: [], dislikes: [] };
    } catch (error) {
      logger.error(`Error getting likes and dislikes for member ${memberId}:`, error);
      throw new Error(`Failed to get likes and dislikes: ${error.message}`);
    }
  }

  /**
   * Update a food preference
   * @param {string} id - Food preference ID
   * @param {Object} data - Food preference data
   * @param {number} data.preferenceLevel - Preference level (-3 to +3)
   * @param {string} data.notes - Notes
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated food preference
   */
  static async update(id, data, tenantId) {
    const { preferenceLevel, notes } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE food_preferences
        SET preference_level = COALESCE($1, preference_level),
            notes = COALESCE($2, notes),
            updated_at = $3
        WHERE id = $4 AND tenant_id = $5
        RETURNING id, member_id, ingredient_id, preference_level, notes, created_at, updated_at, tenant_id
      `;
      const values = [preferenceLevel, notes, updatedAt, id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating food preference ${id}:`, error);
      throw new Error(`Failed to update food preference: ${error.message}`);
    }
  }

  /**
   * Delete a food preference
   * @param {string} id - Food preference ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM food_preferences
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting food preference ${id}:`, error);
      throw new Error(`Failed to delete food preference: ${error.message}`);
    }
  }

  /**
   * Set a food preference for a member (create or update)
   * @param {Object} data - Food preference data
   * @param {string} data.memberId - Member ID
   * @param {string} data.ingredientId - Ingredient ID
   * @param {number} data.preferenceLevel - Preference level (-3 to +3)
   * @param {string} data.notes - Notes
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created or updated food preference
   */
  static async setPreference(data) {
    const { memberId, ingredientId, preferenceLevel, notes, tenantId } = data;

    try {
      // Check if preference already exists
      const checkQuery = `
        SELECT id FROM food_preferences
        WHERE member_id = $1 AND ingredient_id = $2 AND tenant_id = $3
      `;
      const checkValues = [memberId, ingredientId, tenantId];
      const checkResult = await pool.query(checkQuery, checkValues);
      
      if (checkResult.rows.length > 0) {
        // Update existing preference
        return await this.update(checkResult.rows[0].id, { preferenceLevel, notes }, tenantId);
      } else {
        // Create new preference
        return await this.create({ memberId, ingredientId, preferenceLevel, notes, tenantId });
      }
    } catch (error) {
      logger.error(`Error setting food preference for member ${memberId}:`, error);
      throw new Error(`Failed to set food preference: ${error.message}`);
    }
  }
}

module.exports = FoodPreference;
