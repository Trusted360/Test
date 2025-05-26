const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * HouseholdGroup model
 */
class HouseholdGroup {
  /**
   * Create a new household group
   * @param {Object} data - Household group data
   * @param {string} data.householdId - Household ID
   * @param {string} data.name - Group name
   * @param {string} data.description - Group description
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created household group
   */
  static async create(data) {
    const { householdId, name, description, tenantId } = data;
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO household_groups (id, household_id, name, description, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, household_id, name, description, created_at, updated_at, tenant_id
      `;
      const values = [id, householdId, name, description, createdAt, updatedAt, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating household group:', error);
      throw new Error(`Failed to create household group: ${error.message}`);
    }
  }

  /**
   * Get a household group by ID
   * @param {string} id - Household group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Household group
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, household_id, name, description, created_at, updated_at, tenant_id
        FROM household_groups
        WHERE id = $1 AND tenant_id = $2
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting household group ${id}:`, error);
      throw new Error(`Failed to get household group: ${error.message}`);
    }
  }

  /**
   * Get all groups for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Household groups
   */
  static async getByHouseholdId(householdId, tenantId) {
    try {
      const query = `
        SELECT id, household_id, name, description, created_at, updated_at, tenant_id
        FROM household_groups
        WHERE household_id = $1 AND tenant_id = $2
        ORDER BY name
      `;
      const values = [householdId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting groups for household ${householdId}:`, error);
      throw new Error(`Failed to get household groups: ${error.message}`);
    }
  }

  /**
   * Update a household group
   * @param {string} id - Household group ID
   * @param {Object} data - Household group data
   * @param {string} data.name - Group name
   * @param {string} data.description - Group description
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated household group
   */
  static async update(id, data, tenantId) {
    const { name, description } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE household_groups
        SET name = $1, description = $2, updated_at = $3
        WHERE id = $4 AND tenant_id = $5
        RETURNING id, household_id, name, description, created_at, updated_at, tenant_id
      `;
      const values = [name, description, updatedAt, id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating household group ${id}:`, error);
      throw new Error(`Failed to update household group: ${error.message}`);
    }
  }

  /**
   * Delete a household group
   * @param {string} id - Household group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM household_groups
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting household group ${id}:`, error);
      throw new Error(`Failed to delete household group: ${error.message}`);
    }
  }

  /**
   * Get members of a household group
   * @param {string} id - Household group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Members
   */
  static async getMembers(id, tenantId) {
    try {
      const query = `
        SELECT m.id, m.household_id, m.name, m.date_of_birth, m.active, 
               m.created_at, m.updated_at, m.tenant_id, hgm.is_primary
        FROM members m
        JOIN household_group_members hgm ON m.id = hgm.member_id
        WHERE hgm.group_id = $1 AND m.tenant_id = $2
        ORDER BY m.name
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting members for household group ${id}:`, error);
      throw new Error(`Failed to get household group members: ${error.message}`);
    }
  }

  /**
   * Get meal plans for a household group
   * @param {string} id - Household group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Meal plans
   */
  static async getMealPlans(id, tenantId) {
    try {
      const query = `
        SELECT mp.id, mp.household_id, mp.week_start_date, mp.status, 
               mp.created_at, mp.updated_at, mp.tenant_id
        FROM meal_plans mp
        JOIN meal_plan_groups mpg ON mp.id = mpg.meal_plan_id
        WHERE mpg.group_id = $1 AND mp.tenant_id = $2
        ORDER BY mp.week_start_date DESC
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting meal plans for household group ${id}:`, error);
      throw new Error(`Failed to get household group meal plans: ${error.message}`);
    }
  }
}

module.exports = HouseholdGroup; 