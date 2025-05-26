const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * MealHistory model
 */
class MealHistory {
  constructor(db) {
    this.db = db;
    this.tableName = 'meal_history';  // Changed from 'meal_historys' to match actual table name
  }

  /**
   * Create a new meal history record
   * @param {Object} data - Meal history data
   * @param {string} data.mealPlanId - Meal plan ID
   * @param {string} data.householdId - Household ID
   * @param {Date} data.weekStartDate - Week start date
   * @param {Date} data.weekEndDate - Week end date
   * @param {string} data.status - Status (completed, partially_completed)
   * @param {number} data.completionPercentage - Completion percentage (0-100)
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal history
   */
  static async create(data) {
    const { 
      mealPlanId, 
      householdId, 
      weekStartDate, 
      weekEndDate, 
      status = 'completed', 
      completionPercentage = 0,
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO meal_history (
          id, meal_plan_id, household_id, week_start_date, week_end_date, 
          status, completion_percentage, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, meal_plan_id, household_id, week_start_date, week_end_date, 
                  status, completion_percentage, created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, mealPlanId, householdId, weekStartDate, weekEndDate, 
        status, completionPercentage, createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating meal history:', error);
      throw new Error(`Failed to create meal history: ${error.message}`);
    }
  }

  /**
   * Get a meal history by ID
   * @param {string} id - Meal history ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Meal history
   */
  static async getById(id, tenantId) {
    try {
      // Get meal history
      const mealHistoryQuery = `
        SELECT id, meal_plan_id, household_id, week_start_date, week_end_date, 
               status, completion_percentage, created_at, updated_at, tenant_id
        FROM meal_history
        WHERE id = $1 AND tenant_id = $2
      `;
      const mealHistoryValues = [id, tenantId];
      const mealHistoryResult = await pool.query(mealHistoryQuery, mealHistoryValues);
      
      if (mealHistoryResult.rows.length === 0) {
        return null;
      }
      
      const mealHistory = mealHistoryResult.rows[0];
      
      // Get meal history items
      const itemsQuery = `
        SELECT mhi.id, mhi.meal_history_id, mhi.meal_plan_item_id, mhi.recipe_id, 
               mhi.planned_date, mhi.actual_date, mhi.meal_type, mhi.was_prepared, 
               mhi.was_substituted, mhi.substituted_recipe_id, mhi.servings, 
               mhi.created_at, mhi.updated_at,
               r.title as recipe_title, r.image_url as recipe_image_url,
               sr.title as substituted_recipe_title, sr.image_url as substituted_recipe_image_url
        FROM meal_history_items mhi
        JOIN recipes r ON mhi.recipe_id = r.id
        LEFT JOIN recipes sr ON mhi.substituted_recipe_id = sr.id
        WHERE mhi.meal_history_id = $1 AND mhi.tenant_id = $2
        ORDER BY mhi.planned_date, 
                 CASE 
                   WHEN mhi.meal_type = 'breakfast' THEN 1
                   WHEN mhi.meal_type = 'lunch' THEN 2
                   WHEN mhi.meal_type = 'dinner' THEN 3
                   ELSE 4
                 END
      `;
      const itemsValues = [id, tenantId];
      const itemsResult = await pool.query(itemsQuery, itemsValues);
      
      mealHistory.items = itemsResult.rows.map(row => ({
        id: row.id,
        mealHistoryId: row.meal_history_id,
        mealPlanItemId: row.meal_plan_item_id,
        recipeId: row.recipe_id,
        plannedDate: row.planned_date,
        actualDate: row.actual_date,
        mealType: row.meal_type,
        wasPrepared: row.was_prepared,
        wasSubstituted: row.was_substituted,
        substitutedRecipeId: row.substituted_recipe_id,
        servings: row.servings,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        recipe: {
          id: row.recipe_id,
          title: row.recipe_title,
          imageUrl: row.recipe_image_url
        },
        substitutedRecipe: row.substituted_recipe_id ? {
          id: row.substituted_recipe_id,
          title: row.substituted_recipe_title,
          imageUrl: row.substituted_recipe_image_url
        } : null
      }));
      
      return mealHistory;
    } catch (error) {
      logger.error(`Error getting meal history ${id}:`, error);
      throw new Error(`Failed to get meal history: ${error.message}`);
    }
  }

  /**
   * Get all meal history records for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of records to return
   * @param {number} options.offset - Number of records to skip
   * @returns {Promise<Array>} Meal history records
   */
  static async getByHouseholdId(householdId, tenantId, options = {}) {
    const { limit = 10, offset = 0 } = options;

    try {
      const query = `
        SELECT id, meal_plan_id, household_id, week_start_date, week_end_date, 
               status, completion_percentage, created_at, updated_at, tenant_id
        FROM meal_history
        WHERE household_id = $1 AND tenant_id = $2
        ORDER BY week_start_date DESC
        LIMIT $3 OFFSET $4
      `;
      
      const values = [householdId, tenantId, limit, offset];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting meal history for household ${householdId}:`, error);
      throw new Error(`Failed to get household meal history: ${error.message}`);
    }
  }

  /**
   * Get meal history for a specific meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Meal history
   */
  static async getByMealPlanId(mealPlanId, tenantId) {
    try {
      const query = `
        SELECT id, meal_plan_id, household_id, week_start_date, week_end_date, 
               status, completion_percentage, created_at, updated_at, tenant_id
        FROM meal_history
        WHERE meal_plan_id = $1 AND tenant_id = $2
      `;
      
      const values = [mealPlanId, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Get full meal history with items
      return await MealHistory.getById(result.rows[0].id, tenantId);
    } catch (error) {
      logger.error(`Error getting meal history for meal plan ${mealPlanId}:`, error);
      throw new Error(`Failed to get meal plan history: ${error.message}`);
    }
  }

  /**
   * Update a meal history record
   * @param {string} id - Meal history ID
   * @param {Object} data - Meal history data
   * @param {string} data.status - Status
   * @param {number} data.completionPercentage - Completion percentage
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated meal history
   */
  static async update(id, data, tenantId) {
    const { status, completionPercentage } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE meal_history
        SET status = $1, completion_percentage = $2, updated_at = $3
        WHERE id = $4 AND tenant_id = $5
        RETURNING id, meal_plan_id, household_id, week_start_date, week_end_date, 
                  status, completion_percentage, created_at, updated_at, tenant_id
      `;
      
      const values = [status, completionPercentage, updatedAt, id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating meal history ${id}:`, error);
      throw new Error(`Failed to update meal history: ${error.message}`);
    }
  }

  /**
   * Delete a meal history record
   * @param {string} id - Meal history ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Delete meal history items
      const deleteItemsQuery = `
        DELETE FROM meal_history_items
        WHERE meal_history_id = $1 AND tenant_id = $2
      `;
      const deleteItemsValues = [id, tenantId];
      await pool.query(deleteItemsQuery, deleteItemsValues);
      
      // Delete meal history
      const deleteMealHistoryQuery = `
        DELETE FROM meal_history
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const deleteMealHistoryValues = [id, tenantId];
      const result = await pool.query(deleteMealHistoryQuery, deleteMealHistoryValues);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return result.rows.length > 0;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error deleting meal history ${id}:`, error);
      throw new Error(`Failed to delete meal history: ${error.message}`);
    }
  }

  /**
   * Add an item to a meal history
   * @param {Object} data - Meal history item data
   * @param {string} data.mealHistoryId - Meal history ID
   * @param {string} data.mealPlanItemId - Meal plan item ID
   * @param {string} data.recipeId - Recipe ID
   * @param {Date} data.plannedDate - Planned date
   * @param {Date} data.actualDate - Actual date
   * @param {string} data.mealType - Meal type (breakfast, lunch, dinner, snack)
   * @param {boolean} data.wasPrepared - Whether the meal was prepared
   * @param {boolean} data.wasSubstituted - Whether a different recipe was used
   * @param {string} data.substitutedRecipeId - Substituted recipe ID
   * @param {number} data.servings - Number of servings
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal history item
   */
  static async addItem(data) {
    const { 
      mealHistoryId, 
      mealPlanItemId, 
      recipeId, 
      plannedDate, 
      actualDate, 
      mealType, 
      wasPrepared = false, 
      wasSubstituted = false, 
      substitutedRecipeId = null, 
      servings, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO meal_history_items (
          id, meal_history_id, meal_plan_item_id, recipe_id, planned_date, 
          actual_date, meal_type, was_prepared, was_substituted, 
          substituted_recipe_id, servings, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, meal_history_id, meal_plan_item_id, recipe_id, planned_date, 
                  actual_date, meal_type, was_prepared, was_substituted, 
                  substituted_recipe_id, servings, created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, mealHistoryId, mealPlanItemId, recipeId, plannedDate, 
        actualDate, mealType, wasPrepared, wasSubstituted, 
        substitutedRecipeId, servings, createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding item to meal history:', error);
      throw new Error(`Failed to add item to meal history: ${error.message}`);
    }
  }

  /**
   * Update a meal history item
   * @param {string} id - Meal history item ID
   * @param {Object} data - Meal history item data
   * @param {Date} data.actualDate - Actual date
   * @param {boolean} data.wasPrepared - Whether the meal was prepared
   * @param {boolean} data.wasSubstituted - Whether a different recipe was used
   * @param {string} data.substitutedRecipeId - Substituted recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated meal history item
   */
  static async updateItem(id, data, tenantId) {
    const { actualDate, wasPrepared, wasSubstituted, substitutedRecipeId } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE meal_history_items
        SET actual_date = $1, was_prepared = $2, was_substituted = $3, 
            substituted_recipe_id = $4, updated_at = $5
        WHERE id = $6 AND tenant_id = $7
        RETURNING id, meal_history_id, meal_plan_item_id, recipe_id, planned_date, 
                  actual_date, meal_type, was_prepared, was_substituted, 
                  substituted_recipe_id, servings, created_at, updated_at, tenant_id
      `;
      
      const values = [
        actualDate, wasPrepared, wasSubstituted, 
        substitutedRecipeId, updatedAt, id, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating meal history item ${id}:`, error);
      throw new Error(`Failed to update meal history item: ${error.message}`);
    }
  }

  /**
   * Add feedback for a meal history item
   * @param {Object} data - Feedback data
   * @param {string} data.mealHistoryItemId - Meal history item ID
   * @param {string} data.memberId - Member ID
   * @param {number} data.rating - Rating (1-5)
   * @param {string} data.feedbackText - Feedback text
   * @param {boolean} data.consumedAll - Whether the member consumed their entire portion
   * @param {boolean} data.wouldEatAgain - Whether the member would eat this again
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created feedback
   */
  static async addFeedback(data) {
    const { 
      mealHistoryItemId, 
      memberId, 
      rating, 
      feedbackText = null, 
      consumedAll = true, 
      wouldEatAgain = true, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      // Check if feedback already exists
      const checkQuery = `
        SELECT id FROM meal_feedback
        WHERE meal_history_item_id = $1 AND member_id = $2 AND tenant_id = $3
      `;
      
      const checkValues = [mealHistoryItemId, memberId, tenantId];
      const checkResult = await pool.query(checkQuery, checkValues);
      
      if (checkResult.rows.length > 0) {
        // Update existing feedback
        const updateQuery = `
          UPDATE meal_feedback
          SET rating = $1, feedback_text = $2, consumed_all = $3, 
              would_eat_again = $4, updated_at = $5
          WHERE id = $6
          RETURNING id, meal_history_item_id, member_id, rating, feedback_text, 
                    consumed_all, would_eat_again, created_at, updated_at, tenant_id
        `;
        
        const updateValues = [
          rating, feedbackText, consumedAll, 
          wouldEatAgain, updatedAt, checkResult.rows[0].id
        ];
        
        const updateResult = await pool.query(updateQuery, updateValues);
        
        return updateResult.rows[0];
      }
      
      // Insert new feedback
      const insertQuery = `
        INSERT INTO meal_feedback (
          id, meal_history_item_id, member_id, rating, feedback_text, 
          consumed_all, would_eat_again, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, meal_history_item_id, member_id, rating, feedback_text, 
                  consumed_all, would_eat_again, created_at, updated_at, tenant_id
      `;
      
      const insertValues = [
        id, mealHistoryItemId, memberId, rating, feedbackText, 
        consumedAll, wouldEatAgain, createdAt, updatedAt, tenantId
      ];
      
      const insertResult = await pool.query(insertQuery, insertValues);
      
      return insertResult.rows[0];
    } catch (error) {
      logger.error('Error adding meal feedback:', error);
      throw new Error(`Failed to add meal feedback: ${error.message}`);
    }
  }

  /**
   * Get feedback for a meal history item
   * @param {string} mealHistoryItemId - Meal history item ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Feedback
   */
  static async getFeedback(mealHistoryItemId, tenantId) {
    try {
      const query = `
        SELECT mf.id, mf.meal_history_item_id, mf.member_id, mf.rating, 
               mf.feedback_text, mf.consumed_all, mf.would_eat_again, 
               mf.created_at, mf.updated_at, mf.tenant_id,
               m.name as member_name
        FROM meal_feedback mf
        JOIN members m ON mf.member_id = m.id
        WHERE mf.meal_history_item_id = $1 AND mf.tenant_id = $2
        ORDER BY mf.created_at DESC
      `;
      
      const values = [mealHistoryItemId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.map(row => ({
        id: row.id,
        mealHistoryItemId: row.meal_history_item_id,
        memberId: row.member_id,
        memberName: row.member_name,
        rating: row.rating,
        feedbackText: row.feedback_text,
        consumedAll: row.consumed_all,
        wouldEatAgain: row.would_eat_again,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        tenantId: row.tenant_id
      }));
    } catch (error) {
      logger.error(`Error getting feedback for meal history item ${mealHistoryItemId}:`, error);
      throw new Error(`Failed to get meal feedback: ${error.message}`);
    }
  }

  /**
   * Create a meal history record from a completed meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created meal history
   */
  static async createFromMealPlan(mealPlanId, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Get meal plan details
      const mealPlanQuery = `
        SELECT id, household_id, name, start_date, end_date, status, 
               approval_status, created_at, updated_at, tenant_id
        FROM meal_plans
        WHERE id = $1 AND tenant_id = $2
      `;
      
      const mealPlanValues = [mealPlanId, tenantId];
      const mealPlanResult = await pool.query(mealPlanQuery, mealPlanValues);
      
      if (mealPlanResult.rows.length === 0) {
        throw new Error(`Meal plan not found: ${mealPlanId}`);
      }
      
      const mealPlan = mealPlanResult.rows[0];
      
      // Create meal history record
      const mealHistory = await MealHistory.create({
        mealPlanId: mealPlan.id,
        householdId: mealPlan.household_id,
        weekStartDate: mealPlan.start_date,
        weekEndDate: mealPlan.end_date,
        status: 'completed',
        completionPercentage: 0, // Will be updated later
        tenantId
      });
      
      // Get meal plan items
      const mealPlanItemsQuery = `
        SELECT id, meal_plan_id, recipe_id, planned_date, meal_type, 
               servings, notes, created_at, updated_at, tenant_id
        FROM meal_plan_items
        WHERE meal_plan_id = $1 AND tenant_id = $2
      `;
      
      const mealPlanItemsValues = [mealPlanId, tenantId];
      const mealPlanItemsResult = await pool.query(mealPlanItemsQuery, mealPlanItemsValues);
      
      // Create meal history items
      for (const item of mealPlanItemsResult.rows) {
        await MealHistory.addItem({
          mealHistoryId: mealHistory.id,
          mealPlanItemId: item.id,
          recipeId: item.recipe_id,
          plannedDate: item.planned_date,
          actualDate: null, // Will be updated when the meal is prepared
          mealType: item.meal_type,
          wasPrepared: false, // Will be updated when the meal is prepared
          wasSubstituted: false, // Will be updated when the meal is prepared
          substitutedRecipeId: null, // Will be updated when the meal is prepared
          servings: item.servings,
          tenantId
        });
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      // Return the complete meal history
      return await MealHistory.getById(mealHistory.id, tenantId);
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error creating meal history from meal plan ${mealPlanId}:`, error);
      throw new Error(`Failed to create meal history from meal plan: ${error.message}`);
    }
  }

  /**
   * Update completion percentage based on prepared items
   * @param {string} id - Meal history ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated meal history
   */
  static async updateCompletionPercentage(id, tenantId) {
    try {
      // Get all items for this meal history
      const itemsQuery = `
        SELECT COUNT(*) as total,
               SUM(CASE WHEN was_prepared = true THEN 1 ELSE 0 END) as prepared
        FROM meal_history_items
        WHERE meal_history_id = $1 AND tenant_id = $2
      `;
      
      const itemsValues = [id, tenantId];
      const itemsResult = await pool.query(itemsQuery, itemsValues);
      
      if (itemsResult.rows.length === 0 || itemsResult.rows[0].total === 0) {
        return null;
      }
      
      const total = parseInt(itemsResult.rows[0].total);
      const prepared = parseInt(itemsResult.rows[0].prepared);
      const completionPercentage = Math.round((prepared / total) * 100);
      
      // Update meal history
      const status = completionPercentage === 100 ? 'completed' : 'partially_completed';
      
      return await MealHistory.update(id, { status, completionPercentage }, tenantId);
    } catch (error) {
      logger.error(`Error updating completion percentage for meal history ${id}:`, error);
      throw new Error(`Failed to update completion percentage: ${error.message}`);
    }
  }

  /**
   * Generate insights from meal history
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Generated insights
   */
  static async generateInsights(householdId, tenantId) {
    try {
      // This is a placeholder for the actual AI-powered insight generation
      // In a real implementation, this would call the Ollama service
      
      // Get meal history for this household
      const historyQuery = `
        SELECT id
        FROM meal_history
        WHERE household_id = $1 AND tenant_id = $2
        ORDER BY week_start_date DESC
        LIMIT 10
      `;
      
      const historyValues = [householdId, tenantId];
      const historyResult = await pool.query(historyQuery, historyValues);
      
      if (historyResult.rows.length === 0) {
        return [];
      }
      
      // Get feedback for these meal histories
      const feedbackQuery = `
        SELECT mf.rating, mf.consumed_all, mf.would_eat_again,
               mhi.recipe_id, mhi.was_substituted, mhi.substituted_recipe_id,
               r.title as recipe_title
        FROM meal_feedback mf
        JOIN meal_history_items mhi ON mf.meal_history_item_id = mhi.id
        JOIN recipes r ON mhi.recipe_id = r.id
        WHERE mhi.meal_history_id IN (
          SELECT id FROM meal_history
          WHERE household_id = $1 AND tenant_id = $2
          ORDER BY week_start_date DESC
          LIMIT 10
        )
        AND mf.tenant_id = $2
      `;
      
      const feedbackValues = [householdId, tenantId];
      const feedbackResult = await pool.query(feedbackQuery, feedbackValues);
      
      // Generate insights
      const insights = [];
      
      // Example insight: Highly rated recipes
      const highlyRatedRecipes = {};
      
      for (const feedback of feedbackResult.rows) {
        const recipeId = feedback.recipe_id;
        
        if (!highlyRatedRecipes[recipeId]) {
          highlyRatedRecipes[recipeId] = {
            recipeId,
            recipeTitle: feedback.recipe_title,
            ratings: [],
            wouldEatAgain: 0,
            totalRatings: 0
          };
        }
        
        highlyRatedRecipes[recipeId].ratings.push(feedback.rating);
        highlyRatedRecipes[recipeId].totalRatings++;
        
        if (feedback.would_eat_again) {
          highlyRatedRecipes[recipeId].wouldEatAgain++;
        }
      }
      
      // Find recipes with average rating >= 4 and would eat again >= 80%
      const favoriteRecipes = Object.values(highlyRatedRecipes)
        .filter(recipe => {
          const avgRating = recipe.ratings.reduce((sum, rating) => sum + rating, 0) / recipe.ratings.length;
          const wouldEatAgainPercentage = (recipe.wouldEatAgain / recipe.totalRatings) * 100;
          
          return avgRating >= 4 && wouldEatAgainPercentage >= 80 && recipe.totalRatings >= 2;
        })
        .map(recipe => ({
          recipeId: recipe.recipeId,
          recipeTitle: recipe.recipeTitle
        }));
      
      if (favoriteRecipes.length > 0) {
        const id = uuidv4();
        const createdAt = new Date();
        const updatedAt = createdAt;
        
        const insightData = {
          favoriteRecipes,
          message: `Your household has ${favoriteRecipes.length} favorite recipes that are consistently highly rated.`
        };
        
        const insertQuery = `
          INSERT INTO meal_insights (
            id, household_id, insight_type, insight_data, confidence,
            is_applied, created_at, updated_at, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, household_id, insight_type, insight_data, confidence,
                    is_applied, created_at, updated_at, tenant_id
        `;
        
        const insertValues = [
          id, householdId, 'preference', insightData, 90, 
          false, createdAt, updatedAt, tenantId
        ];
        
        const insertResult = await pool.query(insertQuery, insertValues);
        insights.push(insertResult.rows[0]);
      }
      
      return insights;
    } catch (error) {
      logger.error(`Error generating insights for household ${householdId}:`, error);
      throw new Error(`Failed to generate insights: ${error.message}`);
    }
  }
}

module.exports = MealHistory;
