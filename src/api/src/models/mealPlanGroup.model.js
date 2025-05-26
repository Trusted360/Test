const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * MealPlanGroup model
 */
class MealPlanGroup {
  /**
   * Associate a meal plan with a household group
   * @param {Object} data - Meal plan group data
   * @param {string} data.mealPlanId - Meal plan ID
   * @param {string} data.groupId - Group ID
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal plan group association
   */
  static async create(data) {
    const { mealPlanId, groupId, tenantId } = data;
    const id = uuidv4();
    const createdAt = new Date();

    try {
      const query = `
        INSERT INTO meal_plan_groups (id, meal_plan_id, group_id, created_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, meal_plan_id, group_id, created_at, tenant_id
      `;
      const values = [id, mealPlanId, groupId, createdAt, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error associating meal plan with group:', error);
      throw new Error(`Failed to associate meal plan with group: ${error.message}`);
    }
  }

  /**
   * Get a meal plan group association by ID
   * @param {string} id - Meal plan group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Meal plan group
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, meal_plan_id, group_id, created_at, tenant_id
        FROM meal_plan_groups
        WHERE id = $1 AND tenant_id = $2
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting meal plan group ${id}:`, error);
      throw new Error(`Failed to get meal plan group: ${error.message}`);
    }
  }

  /**
   * Get all groups associated with a meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Groups
   */
  static async getGroupsByMealPlan(mealPlanId, tenantId) {
    try {
      const query = `
        SELECT hg.id, hg.household_id, hg.name, hg.description, 
               hg.created_at, hg.updated_at, hg.tenant_id
        FROM household_groups hg
        JOIN meal_plan_groups mpg ON hg.id = mpg.group_id
        WHERE mpg.meal_plan_id = $1 AND hg.tenant_id = $2
        ORDER BY hg.name
      `;
      const values = [mealPlanId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting groups for meal plan ${mealPlanId}:`, error);
      throw new Error(`Failed to get meal plan groups: ${error.message}`);
    }
  }

  /**
   * Get all meal plans associated with a group
   * @param {string} groupId - Group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Meal plans
   */
  static async getMealPlansByGroup(groupId, tenantId) {
    try {
      const query = `
        SELECT mp.id, mp.household_id, mp.week_start_date, mp.status, 
               mp.created_at, mp.updated_at, mp.tenant_id
        FROM meal_plans mp
        JOIN meal_plan_groups mpg ON mp.id = mpg.meal_plan_id
        WHERE mpg.group_id = $1 AND mp.tenant_id = $2
        ORDER BY mp.week_start_date DESC
      `;
      const values = [groupId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting meal plans for group ${groupId}:`, error);
      throw new Error(`Failed to get group meal plans: ${error.message}`);
    }
  }

  /**
   * Delete a meal plan group association
   * @param {string} id - Meal plan group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM meal_plan_groups
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting meal plan group ${id}:`, error);
      throw new Error(`Failed to delete meal plan group: ${error.message}`);
    }
  }

  /**
   * Remove all group associations for a meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteByMealPlan(mealPlanId, tenantId) {
    try {
      const query = `
        DELETE FROM meal_plan_groups
        WHERE meal_plan_id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [mealPlanId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing groups from meal plan ${mealPlanId}:`, error);
      throw new Error(`Failed to remove groups from meal plan: ${error.message}`);
    }
  }

  /**
   * Remove all meal plan associations for a group
   * @param {string} groupId - Group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteByGroup(groupId, tenantId) {
    try {
      const query = `
        DELETE FROM meal_plan_groups
        WHERE group_id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const values = [groupId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing meal plans from group ${groupId}:`, error);
      throw new Error(`Failed to remove meal plans from group: ${error.message}`);
    }
  }
}

module.exports = MealPlanGroup; 