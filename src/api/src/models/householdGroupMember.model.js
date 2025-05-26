const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * HouseholdGroupMember model
 */
class HouseholdGroupMember {
  /**
   * Add a member to a household group
   * @param {Object} data - Group member data
   * @param {string} data.groupId - Group ID
   * @param {string} data.memberId - Member ID
   * @param {boolean} data.isPrimary - Whether the member is primary for the group
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created group member
   */
  static async create(data) {
    const { groupId, memberId, isPrimary = false, tenantId } = data;
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO household_group_members (id, group_id, member_id, is_primary, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, group_id, member_id, is_primary, created_at, updated_at, tenant_id
      `;
      const values = [id, groupId, memberId, isPrimary, createdAt, updatedAt, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding member to household group:', error);
      throw new Error(`Failed to add member to household group: ${error.message}`);
    }
  }

  /**
   * Get a group member by ID
   * @param {string} id - Group member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Group member
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, group_id, member_id, is_primary, created_at, updated_at, tenant_id
        FROM household_group_members
        WHERE id = $1 AND tenant_id = $2
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting group member ${id}:`, error);
      throw new Error(`Failed to get group member: ${error.message}`);
    }
  }

  /**
   * Get a specific group member by group ID and member ID
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Group member
   */
  static async getByGroupAndMember(groupId, memberId, tenantId) {
    try {
      const query = `
        SELECT id, group_id, member_id, is_primary, created_at, updated_at, tenant_id
        FROM household_group_members
        WHERE group_id = $1 AND member_id = $2 AND tenant_id = $3
      `;
      const values = [groupId, memberId, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting member ${memberId} from group ${groupId}:`, error);
      throw new Error(`Failed to get group member: ${error.message}`);
    }
  }

  /**
   * Update a group member
   * @param {string} id - Group member ID
   * @param {Object} data - Group member data
   * @param {boolean} data.isPrimary - Whether the member is primary for the group
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated group member
   */
  static async update(id, data, tenantId) {
    const { isPrimary } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE household_group_members
        SET is_primary = $1, updated_at = $2
        WHERE id = $3 AND tenant_id = $4
        RETURNING id, group_id, member_id, is_primary, created_at, updated_at, tenant_id
      `;
      const values = [isPrimary, updatedAt, id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating group member ${id}:`, error);
      throw new Error(`Failed to update group member: ${error.message}`);
    }
  }

  /**
   * Remove a member from a group
   * @param {string} id - Group member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM household_group_members
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing member from group ${id}:`, error);
      throw new Error(`Failed to remove member from group: ${error.message}`);
    }
  }

  /**
   * Remove a member from a group by group ID and member ID
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteByGroupAndMember(groupId, memberId, tenantId) {
    try {
      const query = `
        DELETE FROM household_group_members
        WHERE group_id = $1 AND member_id = $2 AND tenant_id = $3
        RETURNING id
      `;
      const values = [groupId, memberId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing member ${memberId} from group ${groupId}:`, error);
      throw new Error(`Failed to remove member from group: ${error.message}`);
    }
  }

  /**
   * Get all groups a member belongs to
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Groups
   */
  static async getGroupsByMember(memberId, tenantId) {
    try {
      const query = `
        SELECT hg.id, hg.household_id, hg.name, hg.description, 
               hg.created_at, hg.updated_at, hg.tenant_id, hgm.is_primary
        FROM household_groups hg
        JOIN household_group_members hgm ON hg.id = hgm.group_id
        WHERE hgm.member_id = $1 AND hg.tenant_id = $2
        ORDER BY hg.name
      `;
      const values = [memberId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting groups for member ${memberId}:`, error);
      throw new Error(`Failed to get member's groups: ${error.message}`);
    }
  }

  /**
   * Set a member as primary for a group
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated group member
   */
  static async setPrimaryMember(groupId, memberId, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // First, unset any existing primary members for this group
      await pool.query(
        `UPDATE household_group_members 
         SET is_primary = false, updated_at = NOW() 
         WHERE group_id = $1 AND tenant_id = $2 AND is_primary = true`,
        [groupId, tenantId]
      );
      
      // Then set the new primary member
      const query = `
        UPDATE household_group_members
        SET is_primary = true, updated_at = NOW()
        WHERE group_id = $1 AND member_id = $2 AND tenant_id = $3
        RETURNING id, group_id, member_id, is_primary, created_at, updated_at, tenant_id
      `;
      const values = [groupId, memberId, tenantId];
      const result = await pool.query(query, values);
      
      // Commit the transaction
      await pool.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      // Rollback in case of error
      await pool.query('ROLLBACK');
      logger.error(`Error setting primary member ${memberId} for group ${groupId}:`, error);
      throw new Error(`Failed to set primary member: ${error.message}`);
    }
  }
}

module.exports = HouseholdGroupMember; 