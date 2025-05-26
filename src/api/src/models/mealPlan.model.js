const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * MealPlan model
 */
class MealPlan {
  /**
   * Create a new meal plan
   * @param {Object} data - Meal plan data
   * @param {string} data.householdId - Household ID
   * @param {string} data.name - Meal plan name
   * @param {Date} data.startDate - Start date
   * @param {Date} data.endDate - End date
   * @param {string} data.status - Status (draft, active, completed)
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal plan
   */
  static async create(data) {
    const { 
      householdId, 
      name, 
      startDate, 
      endDate, 
      status = 'draft', 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO meal_plans (
          id, household_id, name, start_date, end_date, status, 
          created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, household_id, name, start_date, end_date, status, 
                  created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, householdId, name, startDate, endDate, status, 
        createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating meal plan:', error);
      throw new Error(`Failed to create meal plan: ${error.message}`);
    }
  }

  /**
   * Get a meal plan by ID
   * @param {string} id - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Meal plan
   */
  static async getById(id, tenantId) {
    try {
      // Get meal plan
      const mealPlanQuery = `
        SELECT id, household_id, name, start_date, end_date, status, 
               created_at, updated_at, tenant_id
        FROM meal_plans
        WHERE id = $1 AND tenant_id = $2
      `;
      const mealPlanValues = [id, tenantId];
      const mealPlanResult = await pool.query(mealPlanQuery, mealPlanValues);
      
      if (mealPlanResult.rows.length === 0) {
        return null;
      }
      
      const mealPlan = mealPlanResult.rows[0];
      
      // Get meal plan items
      const itemsQuery = `
        SELECT mpi.id, mpi.recipe_id, mpi.planned_date, mpi.meal_type, 
               mpi.servings, mpi.notes, mpi.created_at, mpi.updated_at,
               r.title as recipe_title, r.description as recipe_description,
               r.image_url as recipe_image_url, r.prep_time, r.cook_time
        FROM meal_plan_items mpi
        JOIN recipes r ON mpi.recipe_id = r.id
        WHERE mpi.meal_plan_id = $1 AND mpi.tenant_id = $2
        ORDER BY mpi.planned_date, 
                 CASE 
                   WHEN mpi.meal_type = 'breakfast' THEN 1
                   WHEN mpi.meal_type = 'lunch' THEN 2
                   WHEN mpi.meal_type = 'dinner' THEN 3
                   ELSE 4
                 END
      `;
      const itemsValues = [id, tenantId];
      const itemsResult = await pool.query(itemsQuery, itemsValues);
      
      mealPlan.items = itemsResult.rows.map(row => ({
        id: row.id,
        recipeId: row.recipe_id,
        plannedDate: row.planned_date,
        mealType: row.meal_type,
        servings: row.servings,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        recipe: {
          id: row.recipe_id,
          title: row.recipe_title,
          description: row.recipe_description,
          imageUrl: row.recipe_image_url,
          prepTime: row.prep_time,
          cookTime: row.cook_time
        }
      }));
      
      return mealPlan;
    } catch (error) {
      logger.error(`Error getting meal plan ${id}:`, error);
      throw new Error(`Failed to get meal plan: ${error.message}`);
    }
  }

  /**
   * Get all meal plans for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Meal plans
   */
  static async getByHouseholdId(householdId, tenantId) {
    try {
      const query = `
        SELECT id, household_id, name, start_date, end_date, status, 
               created_at, updated_at, tenant_id
        FROM meal_plans
        WHERE household_id = $1 AND tenant_id = $2
        ORDER BY start_date DESC
      `;
      
      const values = [householdId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting meal plans for household ${householdId}:`, error);
      throw new Error(`Failed to get household meal plans: ${error.message}`);
    }
  }

  /**
   * Get current meal plan for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Current meal plan
   */
  static async getCurrentForHousehold(householdId, tenantId) {
    try {
      const today = new Date();
      
      const query = `
        SELECT id, household_id, name, start_date, end_date, status, 
               created_at, updated_at, tenant_id
        FROM meal_plans
        WHERE household_id = $1 
          AND tenant_id = $2
          AND start_date <= $3
          AND end_date >= $3
          AND status = 'active'
        ORDER BY start_date DESC
        LIMIT 1
      `;
      
      const values = [householdId, tenantId, today];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Get full meal plan with items
      return await MealPlan.getById(result.rows[0].id, tenantId);
    } catch (error) {
      logger.error(`Error getting current meal plan for household ${householdId}:`, error);
      throw new Error(`Failed to get current meal plan: ${error.message}`);
    }
  }

  /**
   * Update a meal plan
   * @param {string} id - Meal plan ID
   * @param {Object} data - Meal plan data
   * @param {string} data.name - Meal plan name
   * @param {Date} data.startDate - Start date
   * @param {Date} data.endDate - End date
   * @param {string} data.status - Status
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated meal plan
   */
  static async update(id, data, tenantId) {
    const { name, startDate, endDate, status } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE meal_plans
        SET name = $1, start_date = $2, end_date = $3, status = $4, updated_at = $5
        WHERE id = $6 AND tenant_id = $7
        RETURNING id, household_id, name, start_date, end_date, status, 
                  created_at, updated_at, tenant_id
      `;
      
      const values = [name, startDate, endDate, status, updatedAt, id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating meal plan ${id}:`, error);
      throw new Error(`Failed to update meal plan: ${error.message}`);
    }
  }

  /**
   * Delete a meal plan
   * @param {string} id - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Delete meal plan items
      const deleteItemsQuery = `
        DELETE FROM meal_plan_items
        WHERE meal_plan_id = $1 AND tenant_id = $2
      `;
      const deleteItemsValues = [id, tenantId];
      await pool.query(deleteItemsQuery, deleteItemsValues);
      
      // Delete shopping lists associated with this meal plan
      const deleteShoppingListsQuery = `
        DELETE FROM shopping_lists
        WHERE meal_plan_id = $1 AND tenant_id = $2
      `;
      const deleteShoppingListsValues = [id, tenantId];
      await pool.query(deleteShoppingListsQuery, deleteShoppingListsValues);
      
      // Delete meal plan
      const deleteMealPlanQuery = `
        DELETE FROM meal_plans
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const deleteMealPlanValues = [id, tenantId];
      const result = await pool.query(deleteMealPlanQuery, deleteMealPlanValues);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return result.rows.length > 0;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error deleting meal plan ${id}:`, error);
      throw new Error(`Failed to delete meal plan: ${error.message}`);
    }
  }

  /**
   * Add an item to a meal plan
   * @param {Object} data - Meal plan item data
   * @param {string} data.mealPlanId - Meal plan ID
   * @param {string} data.recipeId - Recipe ID
   * @param {Date} data.plannedDate - Planned date
   * @param {string} data.mealType - Meal type (breakfast, lunch, dinner, snack)
   * @param {number} data.servings - Number of servings
   * @param {string} data.notes - Notes
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal plan item
   */
  static async addItem(data) {
    const { 
      mealPlanId, 
      recipeId, 
      plannedDate, 
      mealType, 
      servings, 
      notes, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO meal_plan_items (
          id, meal_plan_id, recipe_id, planned_date, meal_type, 
          servings, notes, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, meal_plan_id, recipe_id, planned_date, meal_type, 
                  servings, notes, created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, mealPlanId, recipeId, plannedDate, mealType, 
        servings, notes, createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding item to meal plan:', error);
      throw new Error(`Failed to add item to meal plan: ${error.message}`);
    }
  }

  /**
   * Update a meal plan item
   * @param {string} id - Meal plan item ID
   * @param {Object} data - Meal plan item data
   * @param {string} data.recipeId - Recipe ID
   * @param {Date} data.plannedDate - Planned date
   * @param {string} data.mealType - Meal type
   * @param {number} data.servings - Number of servings
   * @param {string} data.notes - Notes
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated meal plan item
   */
  static async updateItem(id, data, tenantId) {
    const { recipeId, plannedDate, mealType, servings, notes } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE meal_plan_items
        SET recipe_id = $1, planned_date = $2, meal_type = $3, 
            servings = $4, notes = $5, updated_at = $6
        WHERE id = $7 AND tenant_id = $8
        RETURNING id, meal_plan_id, recipe_id, planned_date, meal_type, 
                  servings, notes, created_at, updated_at, tenant_id
      `;
      
      const values = [
        recipeId, plannedDate, mealType, 
        servings, notes, updatedAt, id, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating meal plan item ${id}:`, error);
      throw new Error(`Failed to update meal plan item: ${error.message}`);
    }
  }

  /**
   * Remove an item from a meal plan
   * @param {string} id - Meal plan item ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeItem(id, tenantId) {
    try {
      const query = `
        DELETE FROM meal_plan_items
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing item from meal plan ${id}:`, error);
      throw new Error(`Failed to remove item from meal plan: ${error.message}`);
    }
  }

  /**
   * Generate a meal plan with filters
   * @param {Object} data - Generation data
   * @param {string} data.householdId - Household ID
   * @param {number} data.days - Number of days
   * @param {Array} data.preferences - Preferences
   * @param {Array} data.dietaryRestrictions - Dietary restrictions
   * @param {Array} data.availableIngredients - Available ingredients
   * @param {Array} data.excludedIngredients - Excluded ingredients
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Generated meal plan
   */
  static async generate(data) {
    const {
      householdId,
      name,
      startDate,
      endDate,
      days,
      preferences = [],
      dietaryRestrictions = [],
      availableIngredients = [],
      excludedIngredients = [],
      tenantId
    } = data;

    try {
      // Create a new meal plan
      const mealPlan = await MealPlan.create({
        householdId,
        name: name || `Meal Plan (${new Date().toLocaleDateString()})`,
        startDate: startDate || new Date(),
        endDate: endDate || new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        status: 'draft',
        tenantId
      });

      // Store meal plan constraints
      await pool.query(
        `INSERT INTO meal_plan_constraints (
          meal_plan_id, preferences, dietary_restrictions, 
          available_ingredients, excluded_ingredients, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          mealPlan.id, 
          JSON.stringify(preferences), 
          JSON.stringify(dietaryRestrictions),
          JSON.stringify(availableIngredients),
          JSON.stringify(excludedIngredients),
          tenantId
        ]
      );

      return mealPlan;
    } catch (error) {
      logger.error('Error generating meal plan:', error);
      throw new Error(`Failed to generate meal plan: ${error.message}`);
    }
  }

  /**
   * Get meal plan constraints
   * @param {string} id - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Meal plan constraints
   */
  static async getConstraints(id, tenantId) {
    try {
      const query = `
        SELECT 
          preferences, 
          dietary_restrictions, 
          available_ingredients, 
          excluded_ingredients
        FROM meal_plan_constraints
        WHERE meal_plan_id = $1 AND tenant_id = $2
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return {
          preferences: [],
          dietaryRestrictions: [],
          availableIngredients: [],
          excludedIngredients: []
        };
      }
      
      const constraints = result.rows[0];
      
      return {
        preferences: constraints.preferences || [],
        dietaryRestrictions: constraints.dietary_restrictions || [],
        availableIngredients: constraints.available_ingredients || [],
        excludedIngredients: constraints.excluded_ingredients || []
      };
    } catch (error) {
      logger.error(`Error getting meal plan constraints for ${id}:`, error);
      throw new Error(`Failed to get meal plan constraints: ${error.message}`);
    }
  }

  /**
   * Update meal plan constraints
   * @param {string} id - Meal plan ID
   * @param {Object} data - Constraint data
   * @param {Array} data.preferences - Preferences
   * @param {Array} data.dietaryRestrictions - Dietary restrictions
   * @param {Array} data.availableIngredients - Available ingredients
   * @param {Array} data.excludedIngredients - Excluded ingredients
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated constraints
   */
  static async updateConstraints(id, data, tenantId) {
    const {
      preferences,
      dietaryRestrictions,
      availableIngredients,
      excludedIngredients
    } = data;

    try {
      // Check if constraints exist
      const existingQuery = `
        SELECT 1 FROM meal_plan_constraints
        WHERE meal_plan_id = $1 AND tenant_id = $2
      `;
      
      const existingResult = await pool.query(existingQuery, [id, tenantId]);
      
      if (existingResult.rows.length === 0) {
        // Create new constraints
        const insertQuery = `
          INSERT INTO meal_plan_constraints (
            meal_plan_id, preferences, dietary_restrictions, 
            available_ingredients, excluded_ingredients, tenant_id
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `;
        
        await pool.query(insertQuery, [
          id, 
          JSON.stringify(preferences || []), 
          JSON.stringify(dietaryRestrictions || []),
          JSON.stringify(availableIngredients || []),
          JSON.stringify(excludedIngredients || []),
          tenantId
        ]);
      } else {
        // Update existing constraints
        const updateQuery = `
          UPDATE meal_plan_constraints
          SET 
            preferences = $1,
            dietary_restrictions = $2,
            available_ingredients = $3,
            excluded_ingredients = $4
          WHERE meal_plan_id = $5 AND tenant_id = $6
        `;
        
        await pool.query(updateQuery, [
          JSON.stringify(preferences || []), 
          JSON.stringify(dietaryRestrictions || []),
          JSON.stringify(availableIngredients || []),
          JSON.stringify(excludedIngredients || []),
          id,
          tenantId
        ]);
      }
      
      return await MealPlan.getConstraints(id, tenantId);
    } catch (error) {
      logger.error(`Error updating meal plan constraints for ${id}:`, error);
      throw new Error(`Failed to update meal plan constraints: ${error.message}`);
    }
  }
}

module.exports = MealPlan;
