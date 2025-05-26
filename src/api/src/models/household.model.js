const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * Household model
 */
class Household {
  /**
   * Create a new household
   * @param {Object} data - Household data
   * @param {string} data.name - Household name
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created household
   */
  static async create(data) {
    const { name, tenantId } = data;
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO households (id, name, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, created_at, updated_at, tenant_id
      `;
      const values = [id, name, createdAt, updatedAt, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating household:', error);
      throw new Error(`Failed to create household: ${error.message}`);
    }
  }

  /**
   * Get a household by ID
   * @param {string} id - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Household
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, name, created_at, updated_at, tenant_id, preferences
        FROM households
        WHERE id = $1 AND tenant_id = $2
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting household ${id}:`, error);
      throw new Error(`Failed to get household: ${error.message}`);
    }
  }

  /**
   * Get all households for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Households
   */
  static async getAll(tenantId) {
    try {
      const query = `
        SELECT id, name, created_at, updated_at, tenant_id, preferences
        FROM households
        WHERE tenant_id = $1
        ORDER BY name
      `;
      const values = [tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting households:', error);
      throw new Error(`Failed to get households: ${error.message}`);
    }
  }

  /**
   * Update a household
   * @param {string} id - Household ID
   * @param {Object} data - Household data
   * @param {string} data.name - Household name
   * @param {Object} data.preferences - Household preferences
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated household
   */
  static async update(id, data, tenantId) {
    const { name, preferences } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE households
        SET name = $1, preferences = $2, updated_at = $3
        WHERE id = $4 AND tenant_id = $5
        RETURNING id, name, created_at, updated_at, tenant_id, preferences
      `;
      const values = [name, preferences, updatedAt, id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating household ${id}:`, error);
      throw new Error(`Failed to update household: ${error.message}`);
    }
  }

  /**
   * Delete a household
   * @param {string} id - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM households
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting household ${id}:`, error);
      throw new Error(`Failed to delete household: ${error.message}`);
    }
  }

  /**
   * Get members of a household
   * @param {string} id - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Members
   */
  static async getMembers(id, tenantId) {
    try {
      const query = `
        SELECT id, household_id, name, date_of_birth, active, created_at, updated_at, tenant_id
        FROM members
        WHERE household_id = $1 AND tenant_id = $2
        ORDER BY name
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting members for household ${id}:`, error);
      throw new Error(`Failed to get household members: ${error.message}`);
    }
  }

  /**
   * Get meal plans for a household
   * @param {string} id - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Meal plans
   */
  static async getMealPlans(id, tenantId) {
    try {
      const query = `
        SELECT id, household_id, week_start_date, status, created_at, updated_at, tenant_id
        FROM meal_plans
        WHERE household_id = $1 AND tenant_id = $2
        ORDER BY week_start_date DESC
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting meal plans for household ${id}:`, error);
      throw new Error(`Failed to get household meal plans: ${error.message}`);
    }
  }

  /**
   * Get shopping lists for a household
   * @param {string} id - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Shopping lists
   */
  static async getShoppingLists(id, tenantId) {
    try {
      const query = `
        SELECT sl.id, sl.meal_plan_id, sl.generated_on, sl.status, sl.created_at, sl.updated_at, sl.tenant_id
        FROM shopping_lists sl
        JOIN meal_plans mp ON sl.meal_plan_id = mp.id
        WHERE mp.household_id = $1 AND sl.tenant_id = $2
        ORDER BY sl.generated_on DESC
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting shopping lists for household ${id}:`, error);
      throw new Error(`Failed to get household shopping lists: ${error.message}`);
    }
  }
}

module.exports = Household;
