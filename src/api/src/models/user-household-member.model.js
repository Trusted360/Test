const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * UserHouseholdMember model for managing user-household member relationships
 */
class UserHouseholdMember {
  constructor(db) {
    this.db = db;
    this.tableName = 'user_household_members';
  }

  /**
   * Create a new user-household member relationship
   * @param {Object} relationData - Relationship data
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Created relationship
   */
  async create(relationData, tenantId) {
    try {
      const { userId, householdMemberId } = relationData;
      
      // Check if relation already exists
      const existingRelation = await this.db(this.tableName)
        .where({ 
          user_id: userId,
          household_member_id: householdMemberId,
          tenant_id: tenantId
        })
        .first();
      
      if (existingRelation) {
        return existingRelation;
      }
      
      const id = uuidv4();
      const now = new Date();
      
      const relation = {
        id,
        user_id: userId,
        household_member_id: householdMemberId,
        tenant_id: tenantId,
        created_at: now,
        updated_at: now
      };
      
      await this.db(this.tableName).insert(relation);
      
      return relation;
    } catch (error) {
      logger.error(`Error creating user-household member relationship: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get household members for a user
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Array} Household members
   */
  async getHouseholdMembersForUser(userId, tenantId) {
    try {
      // Join with household_members to get member details
      return this.db('household_members')
        .join(
          this.tableName,
          'household_members.id',
          '=',
          `${this.tableName}.household_member_id`
        )
        .where({
          [`${this.tableName}.user_id`]: userId,
          [`${this.tableName}.tenant_id`]: tenantId
        })
        .select('household_members.*');
    } catch (error) {
      logger.error(`Error getting household members for user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get users for a household member
   * @param {string} householdMemberId - Household member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Array} Users
   */
  async getUsersForHouseholdMember(householdMemberId, tenantId) {
    try {
      // Join with users to get user details
      return this.db('users')
        .join(
          this.tableName,
          'users.id',
          '=',
          `${this.tableName}.user_id`
        )
        .where({
          [`${this.tableName}.household_member_id`]: householdMemberId,
          [`${this.tableName}.tenant_id`]: tenantId
        })
        .select('users.id', 'users.email', 'users.first_name', 'users.last_name', 'users.role');
    } catch (error) {
      logger.error(`Error getting users for household member: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a user-household member relationship
   * @param {string} userId - User ID
   * @param {string} householdMemberId - Household member ID
   * @param {string} tenantId - Tenant ID
   * @returns {number} Number of deleted rows
   */
  async delete(userId, householdMemberId, tenantId) {
    try {
      return this.db(this.tableName)
        .where({
          user_id: userId,
          household_member_id: householdMemberId,
          tenant_id: tenantId
        })
        .delete();
    } catch (error) {
      logger.error(`Error deleting user-household member relationship: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete all relationships for a user
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {number} Number of deleted rows
   */
  async deleteAllForUser(userId, tenantId) {
    try {
      return this.db(this.tableName)
        .where({
          user_id: userId,
          tenant_id: tenantId
        })
        .delete();
    } catch (error) {
      logger.error(`Error deleting all relationships for user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete all relationships for a household member
   * @param {string} householdMemberId - Household member ID
   * @param {string} tenantId - Tenant ID
   * @returns {number} Number of deleted rows
   */
  async deleteAllForHouseholdMember(householdMemberId, tenantId) {
    try {
      return this.db(this.tableName)
        .where({
          household_member_id: householdMemberId,
          tenant_id: tenantId
        })
        .delete();
    } catch (error) {
      logger.error(`Error deleting all relationships for household member: ${error.message}`);
      throw error;
    }
  }
}

module.exports = UserHouseholdMember; 