const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * RecipeCategory model
 * Represents the many-to-many relationship between recipes and categories
 */
class RecipeCategory {
  /**
   * Add a category to a recipe
   * @param {Object} data - Recipe category data
   * @param {string} data.recipeId - Recipe ID
   * @param {string} data.categoryId - Category ID
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created recipe category
   */
  static async create(data) {
    const { recipeId, categoryId, tenantId } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      // Check if the association already exists
      const checkQuery = `
        SELECT id
        FROM recipe_categories
        WHERE recipe_id = $1 AND category_id = $2 AND tenant_id = $3
      `;
      
      const checkValues = [recipeId, categoryId, tenantId];
      const checkResult = await pool.query(checkQuery, checkValues);
      
      if (checkResult.rows.length > 0) {
        // Association already exists, return it
        return checkResult.rows[0];
      }
      
      // Create new association
      const query = `
        INSERT INTO recipe_categories (
          id, recipe_id, category_id, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, recipe_id, category_id, created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, recipeId, categoryId, createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding category to recipe:', error);
      throw new Error(`Failed to add category to recipe: ${error.message}`);
    }
  }

  /**
   * Get a recipe category by ID
   * @param {string} id - Recipe category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Recipe category
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, recipe_id, category_id, created_at, updated_at, tenant_id
        FROM recipe_categories
        WHERE id = $1 AND tenant_id = $2
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting recipe category ${id}:`, error);
      throw new Error(`Failed to get recipe category: ${error.message}`);
    }
  }

  /**
   * Get all categories for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipe categories
   */
  static async getByRecipeId(recipeId, tenantId) {
    try {
      const query = `
        SELECT rc.id, rc.recipe_id, rc.category_id, rc.created_at, rc.updated_at, rc.tenant_id,
               c.name, c.description, c.category_group_id, c.parent_id, c.display_order, 
               c.icon, c.color, c.is_default,
               cg.name as category_group_name
        FROM recipe_categories rc
        JOIN categories c ON rc.category_id = c.id
        JOIN category_groups cg ON c.category_group_id = cg.id
        WHERE rc.recipe_id = $1 AND rc.tenant_id = $2
        ORDER BY cg.display_order ASC, c.display_order ASC, c.name ASC
      `;
      
      const values = [recipeId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting categories for recipe ${recipeId}:`, error);
      throw new Error(`Failed to get categories for recipe: ${error.message}`);
    }
  }

  /**
   * Get all recipes for a category
   * @param {string} categoryId - Category ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipes
   */
  static async getByCategoryId(categoryId, options = {}, tenantId) {
    const { limit = 20, offset = 0 } = options;
    
    try {
      const query = `
        SELECT r.id, r.title, r.description, r.prep_time, r.cook_time, 
               r.total_time, r.difficulty, r.image_url, r.created_at,
               rc.id as recipe_category_id
        FROM recipes r
        JOIN recipe_categories rc ON r.id = rc.recipe_id
        WHERE rc.category_id = $1 AND r.tenant_id = $2
        ORDER BY r.title
        LIMIT $3 OFFSET $4
      `;
      
      const values = [categoryId, tenantId, limit, offset];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting recipes for category ${categoryId}:`, error);
      throw new Error(`Failed to get recipes for category: ${error.message}`);
    }
  }

  /**
   * Count recipes for a category
   * @param {string} categoryId - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Recipe count
   */
  static async countByCategoryId(categoryId, tenantId) {
    try {
      const query = `
        SELECT COUNT(DISTINCT rc.recipe_id) as count
        FROM recipe_categories rc
        WHERE rc.category_id = $1 AND rc.tenant_id = $2
      `;
      
      const values = [categoryId, tenantId];
      const result = await pool.query(query, values);
      
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error(`Error counting recipes for category ${categoryId}:`, error);
      throw new Error(`Failed to count recipes for category: ${error.message}`);
    }
  }

  /**
   * Remove a category from a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} categoryId - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(recipeId, categoryId, tenantId) {
    try {
      const query = `
        DELETE FROM recipe_categories
        WHERE recipe_id = $1 AND category_id = $2 AND tenant_id = $3
        RETURNING id
      `;
      
      const values = [recipeId, categoryId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing category ${categoryId} from recipe ${recipeId}:`, error);
      throw new Error(`Failed to remove category from recipe: ${error.message}`);
    }
  }

  /**
   * Remove all categories from a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteByRecipeId(recipeId, tenantId) {
    try {
      const query = `
        DELETE FROM recipe_categories
        WHERE recipe_id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const values = [recipeId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing all categories from recipe ${recipeId}:`, error);
      throw new Error(`Failed to remove all categories from recipe: ${error.message}`);
    }
  }

  /**
   * Set categories for a recipe (replace all existing categories)
   * @param {string} recipeId - Recipe ID
   * @param {Array} categoryIds - Category IDs
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Created recipe categories
   */
  static async setCategories(recipeId, categoryIds, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Remove existing categories
      const deleteQuery = `
        DELETE FROM recipe_categories
        WHERE recipe_id = $1 AND tenant_id = $2
      `;
      
      await pool.query(deleteQuery, [recipeId, tenantId]);
      
      // Add new categories
      const createdCategories = [];
      const now = new Date();
      
      for (const categoryId of categoryIds) {
        const insertQuery = `
          INSERT INTO recipe_categories (id, recipe_id, category_id, created_at, updated_at, tenant_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, recipe_id, category_id, created_at, updated_at, tenant_id
        `;
        
        const insertValues = [uuidv4(), recipeId, categoryId, now, now, tenantId];
        const insertResult = await pool.query(insertQuery, insertValues);
        
        createdCategories.push(insertResult.rows[0]);
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return createdCategories;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error setting categories for recipe ${recipeId}:`, error);
      throw new Error(`Failed to set categories for recipe: ${error.message}`);
    }
  }

  /**
   * Get recipes with all specified categories
   * @param {Array} categoryIds - Category IDs
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipes
   */
  static async getRecipesWithAllCategories(categoryIds, options = {}, tenantId) {
    const { limit = 20, offset = 0 } = options;
    
    try {
      const query = `
        SELECT r.id, r.title, r.description, r.prep_time, r.cook_time, 
               r.total_time, r.difficulty, r.image_url, r.created_at
        FROM recipes r
        WHERE r.tenant_id = $1
        AND (
          SELECT COUNT(DISTINCT rc.category_id)
          FROM recipe_categories rc
          WHERE rc.recipe_id = r.id
          AND rc.category_id = ANY($2::uuid[])
        ) = $3
        ORDER BY r.title
        LIMIT $4 OFFSET $5
      `;
      
      const values = [tenantId, categoryIds, categoryIds.length, limit, offset];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting recipes with all categories:`, error);
      throw new Error(`Failed to get recipes with all categories: ${error.message}`);
    }
  }

  /**
   * Get recipes with any of the specified categories
   * @param {Array} categoryIds - Category IDs
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipes
   */
  static async getRecipesWithAnyCategories(categoryIds, options = {}, tenantId) {
    const { limit = 20, offset = 0 } = options;
    
    try {
      const query = `
        SELECT DISTINCT r.id, r.title, r.description, r.prep_time, r.cook_time, 
                        r.total_time, r.difficulty, r.image_url, r.created_at
        FROM recipes r
        JOIN recipe_categories rc ON r.id = rc.recipe_id
        WHERE r.tenant_id = $1
        AND rc.category_id = ANY($2::uuid[])
        ORDER BY r.title
        LIMIT $3 OFFSET $4
      `;
      
      const values = [tenantId, categoryIds, limit, offset];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting recipes with any categories:`, error);
      throw new Error(`Failed to get recipes with any categories: ${error.message}`);
    }
  }

  /**
   * Get popular categories
   * @param {number} limit - Maximum number of results
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Popular categories with counts
   */
  static async getPopularCategories(limit = 10, tenantId) {
    try {
      const query = `
        SELECT c.id, c.name, c.description, c.category_group_id, c.parent_id,
               c.display_order, c.icon, c.color, c.is_default,
               c.created_at, c.updated_at, c.tenant_id,
               cg.name as category_group_name,
               COUNT(DISTINCT rc.recipe_id) as recipe_count
        FROM categories c
        JOIN recipe_categories rc ON c.id = rc.category_id
        JOIN category_groups cg ON c.category_group_id = cg.id
        WHERE c.tenant_id = $1
        GROUP BY c.id, cg.name
        ORDER BY recipe_count DESC
        LIMIT $2
      `;
      
      const values = [tenantId, limit];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting popular categories:`, error);
      throw new Error(`Failed to get popular categories: ${error.message}`);
    }
  }

  /**
   * Get related categories
   * @param {string} categoryId - Category ID
   * @param {number} limit - Maximum number of results
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Related categories with co-occurrence counts
   */
  static async getRelatedCategories(categoryId, limit = 10, tenantId) {
    try {
      const query = `
        SELECT c.id, c.name, c.description, c.category_group_id, c.parent_id,
               c.display_order, c.icon, c.color, c.is_default,
               c.created_at, c.updated_at, c.tenant_id,
               cg.name as category_group_name,
               COUNT(DISTINCT rc1.recipe_id) as co_occurrence_count
        FROM categories c
        JOIN recipe_categories rc1 ON c.id = rc1.category_id
        JOIN recipe_categories rc2 ON rc1.recipe_id = rc2.recipe_id
        JOIN category_groups cg ON c.category_group_id = cg.id
        WHERE rc2.category_id = $1
        AND c.id != $1
        AND c.tenant_id = $2
        GROUP BY c.id, cg.name
        ORDER BY co_occurrence_count DESC
        LIMIT $3
      `;
      
      const values = [categoryId, tenantId, limit];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting related categories for category ${categoryId}:`, error);
      throw new Error(`Failed to get related categories: ${error.message}`);
    }
  }

  /**
   * Auto-categorize a recipe based on rules
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Added categories
   */
  static async autoCategorize(recipeId, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Get recipe details
      const recipeQuery = `
        SELECT id, title, description, instructions
        FROM recipes
        WHERE id = $1 AND tenant_id = $2
      `;
      
      const recipeResult = await pool.query(recipeQuery, [recipeId, tenantId]);
      
      if (recipeResult.rows.length === 0) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      const recipe = recipeResult.rows[0];
      
      // Get all category rules
      const rulesQuery = `
        SELECT cr.id, cr.category_id, cr.rule_type, cr.rule_value, cr.priority,
               c.name as category_name
        FROM category_rules cr
        JOIN categories c ON cr.category_id = c.id
        WHERE cr.tenant_id = $1
        ORDER BY cr.priority DESC
      `;
      
      const rulesResult = await pool.query(rulesQuery, [tenantId]);
      const rules = rulesResult.rows;
      
      // Apply rules to recipe
      const matchedCategories = [];
      
      for (const rule of rules) {
        let match = false;
        
        // Check rule type and apply matching logic
        if (rule.rule_type === 'tag') {
          // Check if recipe has the specified tag
          const tagQuery = `
            SELECT 1
            FROM recipe_tags rt
            JOIN tags t ON rt.tag_id = t.id
            WHERE rt.recipe_id = $1
            AND t.name = $2
            AND rt.tenant_id = $3
            LIMIT 1
          `;
          
          const tagResult = await pool.query(tagQuery, [
            recipeId, 
            rule.rule_value.tag_name, 
            tenantId
          ]);
          
          match = tagResult.rows.length > 0;
        } else if (rule.rule_type === 'ingredient') {
          // Check if recipe contains the specified ingredient
          const ingredientQuery = `
            SELECT 1
            FROM recipe_ingredients ri
            JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE ri.recipe_id = $1
            AND i.name = $2
            AND ri.tenant_id = $3
            LIMIT 1
          `;
          
          const ingredientResult = await pool.query(ingredientQuery, [
            recipeId, 
            rule.rule_value.ingredient_name, 
            tenantId
          ]);
          
          match = ingredientResult.rows.length > 0;
        } else if (rule.rule_type === 'name_contains') {
          // Check if recipe name contains the specified text
          match = recipe.title.toLowerCase().includes(
            rule.rule_value.text.toLowerCase()
          );
        }
        
        // If rule matches, add recipe to category
        if (match) {
          // Check if category is already assigned
          const checkQuery = `
            SELECT id
            FROM recipe_categories
            WHERE recipe_id = $1 AND category_id = $2 AND tenant_id = $3
          `;
          
          const checkResult = await pool.query(checkQuery, [
            recipeId, 
            rule.category_id, 
            tenantId
          ]);
          
          if (checkResult.rows.length === 0) {
            // Add category to recipe
            const insertQuery = `
              INSERT INTO recipe_categories (id, recipe_id, category_id, created_at, updated_at, tenant_id)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id, recipe_id, category_id, created_at, updated_at, tenant_id
            `;
            
            const now = new Date();
            const insertResult = await pool.query(insertQuery, [
              uuidv4(), 
              recipeId, 
              rule.category_id, 
              now, 
              now, 
              tenantId
            ]);
            
            matchedCategories.push({
              ...insertResult.rows[0],
              category_name: rule.category_name
            });
          }
        }
      }
      
      // If no categories were assigned, add default categories
      if (matchedCategories.length === 0) {
        const defaultsQuery = `
          SELECT c.id, c.name
          FROM categories c
          WHERE c.is_default = true AND c.tenant_id = $1
        `;
        
        const defaultsResult = await pool.query(defaultsQuery, [tenantId]);
        const defaultCategories = defaultsResult.rows;
        
        for (const category of defaultCategories) {
          // Check if category is already assigned
          const checkQuery = `
            SELECT id
            FROM recipe_categories
            WHERE recipe_id = $1 AND category_id = $2 AND tenant_id = $3
          `;
          
          const checkResult = await pool.query(checkQuery, [
            recipeId, 
            category.id, 
            tenantId
          ]);
          
          if (checkResult.rows.length === 0) {
            // Add category to recipe
            const insertQuery = `
              INSERT INTO recipe_categories (id, recipe_id, category_id, created_at, updated_at, tenant_id)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id, recipe_id, category_id, created_at, updated_at, tenant_id
            `;
            
            const now = new Date();
            const insertResult = await pool.query(insertQuery, [
              uuidv4(), 
              recipeId, 
              category.id, 
              now, 
              now, 
              tenantId
            ]);
            
            matchedCategories.push({
              ...insertResult.rows[0],
              category_name: category.name
            });
          }
        }
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return matchedCategories;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error auto-categorizing recipe ${recipeId}:`, error);
      throw new Error(`Failed to auto-categorize recipe: ${error.message}`);
    }
  }
}

module.exports = RecipeCategory;
