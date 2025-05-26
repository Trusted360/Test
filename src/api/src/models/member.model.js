const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * Member model
 */
class Member {
  /**
   * Create a new member
   * @param {Object} data - Member data
   * @param {string} data.householdId - Household ID
   * @param {string} data.name - Member name
   * @param {Date} data.dateOfBirth - Date of birth
   * @param {boolean} data.active - Active status
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created member
   */
  static async create(data) {
    const { householdId, name, dateOfBirth, active = true, tenantId } = data;
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO members (id, household_id, name, date_of_birth, active, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, household_id, name, date_of_birth, active, created_at, updated_at, tenant_id
      `;
      const values = [id, householdId, name, dateOfBirth, active, createdAt, updatedAt, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating member:', error);
      throw new Error(`Failed to create member: ${error.message}`);
    }
  }

  /**
   * Get a member by ID
   * @param {string} id - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Member
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, household_id, name, date_of_birth, active, created_at, updated_at, tenant_id
        FROM members
        WHERE id = $1 AND tenant_id = $2
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting member ${id}:`, error);
      throw new Error(`Failed to get member: ${error.message}`);
    }
  }

  /**
   * Get all members for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Members
   */
  static async getByHouseholdId(householdId, tenantId) {
    try {
      const query = `
        SELECT id, household_id, name, date_of_birth, active, created_at, updated_at, tenant_id
        FROM members
        WHERE household_id = $1 AND tenant_id = $2
        ORDER BY name
      `;
      const values = [householdId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting members for household ${householdId}:`, error);
      throw new Error(`Failed to get household members: ${error.message}`);
    }
  }

  /**
   * Update a member
   * @param {string} id - Member ID
   * @param {Object} data - Member data
   * @param {string} data.name - Member name
   * @param {Date} data.dateOfBirth - Date of birth
   * @param {boolean} data.active - Active status
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated member
   */
  static async update(id, data, tenantId) {
    const { name, dateOfBirth, active } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE members
        SET name = $1, date_of_birth = $2, active = $3, updated_at = $4
        WHERE id = $5 AND tenant_id = $6
        RETURNING id, household_id, name, date_of_birth, active, created_at, updated_at, tenant_id
      `;
      const values = [name, dateOfBirth, active, updatedAt, id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating member ${id}:`, error);
      throw new Error(`Failed to update member: ${error.message}`);
    }
  }

  /**
   * Delete a member
   * @param {string} id - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM members
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting member ${id}:`, error);
      throw new Error(`Failed to delete member: ${error.message}`);
    }
  }

  /**
   * Get dietary preferences for a member
   * @param {string} id - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Dietary preferences
   */
  static async getDietaryPreferences(id, tenantId) {
    try {
      const query = `
        SELECT md.id, md.member_id, dt.name as diet_type, md.starts_on, md.ends_on, 
               md.created_at, md.updated_at, md.tenant_id
        FROM member_diets md
        JOIN diet_types dt ON md.diet_type_id = dt.id
        WHERE md.member_id = $1 AND md.tenant_id = $2
        ORDER BY md.starts_on DESC
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting dietary preferences for member ${id}:`, error);
      throw new Error(`Failed to get member dietary preferences: ${error.message}`);
    }
  }

  /**
   * Add a dietary preference for a member
   * @param {Object} data - Dietary preference data
   * @param {string} data.memberId - Member ID
   * @param {string} data.dietTypeId - Diet type ID
   * @param {Date} data.startsOn - Start date
   * @param {Date} data.endsOn - End date (optional)
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created dietary preference
   */
  static async addDietaryPreference(data) {
    const { memberId, dietTypeId, startsOn, endsOn, tenantId } = data;
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO member_diets (id, member_id, diet_type_id, starts_on, ends_on, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, member_id, diet_type_id, starts_on, ends_on, created_at, updated_at, tenant_id
      `;
      const values = [id, memberId, dietTypeId, startsOn, endsOn, createdAt, updatedAt, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding dietary preference:', error);
      throw new Error(`Failed to add dietary preference: ${error.message}`);
    }
  }

  /**
   * Remove a dietary preference
   * @param {string} id - Dietary preference ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeDietaryPreference(id, tenantId) {
    try {
      const query = `
        DELETE FROM member_diets
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing dietary preference ${id}:`, error);
      throw new Error(`Failed to remove dietary preference: ${error.message}`);
    }
  }
}

module.exports = Member;
