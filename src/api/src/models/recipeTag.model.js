const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * RecipeTag model
 * Represents the many-to-many relationship between recipes and tags
 */
class RecipeTag {
  /**
   * Add a tag to a recipe
   * @param {Object} data - Recipe tag data
   * @param {string} data.recipeId - Recipe ID
   * @param {string} data.tagId - Tag ID
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created recipe tag
   */
  static async create(data) {
    const { recipeId, tagId, tenantId } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      // Check if the association already exists
      const checkQuery = `
        SELECT id
        FROM recipe_tags
        WHERE recipe_id = $1 AND tag_id = $2 AND tenant_id = $3
      `;
      
      const checkValues = [recipeId, tagId, tenantId];
      const checkResult = await pool.query(checkQuery, checkValues);
      
      if (checkResult.rows.length > 0) {
        // Association already exists, return it
        return checkResult.rows[0];
      }
      
      // Create new association
      const query = `
        INSERT INTO recipe_tags (
          id, recipe_id, tag_id, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, recipe_id, tag_id, created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, recipeId, tagId, createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding tag to recipe:', error);
      throw new Error(`Failed to add tag to recipe: ${error.message}`);
    }
  }

  /**
   * Get a recipe tag by ID
   * @param {string} id - Recipe tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Recipe tag
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, recipe_id, tag_id, created_at, updated_at, tenant_id
        FROM recipe_tags
        WHERE id = $1 AND tenant_id = $2
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting recipe tag ${id}:`, error);
      throw new Error(`Failed to get recipe tag: ${error.message}`);
    }
  }

  /**
   * Get all tags for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipe tags
   */
  static async getByRecipeId(recipeId, tenantId) {
    try {
      const query = `
        SELECT rt.id, rt.recipe_id, rt.tag_id, rt.created_at, rt.updated_at, rt.tenant_id,
               t.name, t.description, t.category, t.color, t.parent_id
        FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.recipe_id = $1 AND rt.tenant_id = $2
        ORDER BY t.name
      `;
      
      const values = [recipeId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting tags for recipe ${recipeId}:`, error);
      throw new Error(`Failed to get tags for recipe: ${error.message}`);
    }
  }

  /**
   * Get all recipes for a tag
   * @param {string} tagId - Tag ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipes
   */
  static async getByTagId(tagId, options = {}, tenantId) {
    const { limit = 20, offset = 0 } = options;
    
    try {
      const query = `
        SELECT r.id, r.title, r.description, r.prep_time, r.cook_time, 
               r.total_time, r.difficulty, r.image_url, r.created_at,
               rt.id as recipe_tag_id
        FROM recipes r
        JOIN recipe_tags rt ON r.id = rt.recipe_id
        WHERE rt.tag_id = $1 AND r.tenant_id = $2
        ORDER BY r.title
        LIMIT $3 OFFSET $4
      `;
      
      const values = [tagId, tenantId, limit, offset];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting recipes for tag ${tagId}:`, error);
      throw new Error(`Failed to get recipes for tag: ${error.message}`);
    }
  }

  /**
   * Count recipes for a tag
   * @param {string} tagId - Tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Recipe count
   */
  static async countByTagId(tagId, tenantId) {
    try {
      const query = `
        SELECT COUNT(DISTINCT rt.recipe_id) as count
        FROM recipe_tags rt
        WHERE rt.tag_id = $1 AND rt.tenant_id = $2
      `;
      
      const values = [tagId, tenantId];
      const result = await pool.query(query, values);
      
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error(`Error counting recipes for tag ${tagId}:`, error);
      throw new Error(`Failed to count recipes for tag: ${error.message}`);
    }
  }

  /**
   * Remove a tag from a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tagId - Tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(recipeId, tagId, tenantId) {
    try {
      const query = `
        DELETE FROM recipe_tags
        WHERE recipe_id = $1 AND tag_id = $2 AND tenant_id = $3
        RETURNING id
      `;
      
      const values = [recipeId, tagId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing tag ${tagId} from recipe ${recipeId}:`, error);
      throw new Error(`Failed to remove tag from recipe: ${error.message}`);
    }
  }

  /**
   * Remove all tags from a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteByRecipeId(recipeId, tenantId) {
    try {
      const query = `
        DELETE FROM recipe_tags
        WHERE recipe_id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const values = [recipeId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing all tags from recipe ${recipeId}:`, error);
      throw new Error(`Failed to remove all tags from recipe: ${error.message}`);
    }
  }

  /**
   * Set tags for a recipe (replace all existing tags)
   * @param {string} recipeId - Recipe ID
   * @param {Array} tagIds - Tag IDs
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Created recipe tags
   */
  static async setTags(recipeId, tagIds, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Remove existing tags
      const deleteQuery = `
        DELETE FROM recipe_tags
        WHERE recipe_id = $1 AND tenant_id = $2
      `;
      
      await pool.query(deleteQuery, [recipeId, tenantId]);
      
      // Add new tags
      const createdTags = [];
      const now = new Date();
      
      for (const tagId of tagIds) {
        const insertQuery = `
          INSERT INTO recipe_tags (id, recipe_id, tag_id, created_at, updated_at, tenant_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, recipe_id, tag_id, created_at, updated_at, tenant_id
        `;
        
        const insertValues = [uuidv4(), recipeId, tagId, now, now, tenantId];
        const insertResult = await pool.query(insertQuery, insertValues);
        
        createdTags.push(insertResult.rows[0]);
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return createdTags;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error setting tags for recipe ${recipeId}:`, error);
      throw new Error(`Failed to set tags for recipe: ${error.message}`);
    }
  }

  /**
   * Get recipes with all specified tags
   * @param {Array} tagIds - Tag IDs
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipes
   */
  static async getRecipesWithAllTags(tagIds, options = {}, tenantId) {
    const { limit = 20, offset = 0 } = options;
    
    try {
      const query = `
        SELECT r.id, r.title, r.description, r.prep_time, r.cook_time, 
               r.total_time, r.difficulty, r.image_url, r.created_at
        FROM recipes r
        WHERE r.tenant_id = $1
        AND (
          SELECT COUNT(DISTINCT rt.tag_id)
          FROM recipe_tags rt
          WHERE rt.recipe_id = r.id
          AND rt.tag_id = ANY($2::uuid[])
        ) = $3
        ORDER BY r.title
        LIMIT $4 OFFSET $5
      `;
      
      const values = [tenantId, tagIds, tagIds.length, limit, offset];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting recipes with all tags:`, error);
      throw new Error(`Failed to get recipes with all tags: ${error.message}`);
    }
  }

  /**
   * Get recipes with any of the specified tags
   * @param {Array} tagIds - Tag IDs
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipes
   */
  static async getRecipesWithAnyTags(tagIds, options = {}, tenantId) {
    const { limit = 20, offset = 0 } = options;
    
    try {
      const query = `
        SELECT DISTINCT r.id, r.title, r.description, r.prep_time, r.cook_time, 
                        r.total_time, r.difficulty, r.image_url, r.created_at
        FROM recipes r
        JOIN recipe_tags rt ON r.id = rt.recipe_id
        WHERE r.tenant_id = $1
        AND rt.tag_id = ANY($2::uuid[])
        ORDER BY r.title
        LIMIT $3 OFFSET $4
      `;
      
      const values = [tenantId, tagIds, limit, offset];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting recipes with any tags:`, error);
      throw new Error(`Failed to get recipes with any tags: ${error.message}`);
    }
  }

  /**
   * Get co-occurring tags
   * @param {string} tagId - Tag ID
   * @param {number} limit - Maximum number of results
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Co-occurring tags with counts
   */
  static async getCoOccurringTags(tagId, limit = 10, tenantId) {
    try {
      const query = `
        SELECT t.id, t.name, t.description, t.category, t.color, t.parent_id,
               COUNT(DISTINCT rt1.recipe_id) as co_occurrence_count
        FROM tags t
        JOIN recipe_tags rt1 ON t.id = rt1.tag_id
        JOIN recipe_tags rt2 ON rt1.recipe_id = rt2.recipe_id
        WHERE rt2.tag_id = $1
        AND t.id != $1
        AND t.tenant_id = $2
        GROUP BY t.id
        ORDER BY co_occurrence_count DESC
        LIMIT $3
      `;
      
      const values = [tagId, tenantId, limit];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting co-occurring tags for tag ${tagId}:`, error);
      throw new Error(`Failed to get co-occurring tags: ${error.message}`);
    }
  }
}

module.exports = RecipeTag;
