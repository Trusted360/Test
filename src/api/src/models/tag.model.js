const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * Tag model
 * Represents a tag that can be applied to recipes
 */
class Tag {
  /**
   * Create a new tag
   * @param {Object} data - Tag data
   * @param {string} data.name - Tag name
   * @param {string} data.description - Tag description
   * @param {string} data.category - Tag category (e.g., cuisine, diet, meal type, ingredient, cooking method)
   * @param {string} data.color - Tag color (hex code)
   * @param {string} data.parentId - Parent tag ID (for hierarchical tags)
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created tag
   */
  static async create(data) {
    const { 
      name, 
      description = null, 
      category = null, 
      color = null, 
      parentId = null, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO tags (
          id, name, description, category, color, parent_id,
          created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, name, description, category, color, parent_id,
                  created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, name, description, category, color, parentId,
        createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating tag:', error);
      throw new Error(`Failed to create tag: ${error.message}`);
    }
  }

  /**
   * Get a tag by ID
   * @param {string} id - Tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Tag
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, name, description, category, color, parent_id,
               created_at, updated_at, tenant_id
        FROM tags
        WHERE id = $1 AND tenant_id = $2
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting tag ${id}:`, error);
      throw new Error(`Failed to get tag: ${error.message}`);
    }
  }

  /**
   * Get a tag by name
   * @param {string} name - Tag name
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Tag
   */
  static async getByName(name, tenantId) {
    try {
      const query = `
        SELECT id, name, description, category, color, parent_id,
               created_at, updated_at, tenant_id
        FROM tags
        WHERE name = $1 AND tenant_id = $2
      `;
      
      const values = [name, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting tag by name ${name}:`, error);
      throw new Error(`Failed to get tag by name: ${error.message}`);
    }
  }

  /**
   * Get all tags
   * @param {Object} options - Query options
   * @param {string} options.search - Search term
   * @param {string} options.category - Filter by category
   * @param {string} options.parentId - Filter by parent ID
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Tags
   */
  static async getAll(options = {}, tenantId) {
    const { search, category, parentId, limit = 100, offset = 0 } = options;
    
    try {
      let query = `
        SELECT id, name, description, category, color, parent_id,
               created_at, updated_at, tenant_id
        FROM tags
        WHERE tenant_id = $1
      `;
      
      const queryParams = [tenantId];
      let paramIndex = 2;
      
      if (search) {
        query += ` AND name ILIKE $${paramIndex}`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      if (category) {
        query += ` AND category = $${paramIndex}`;
        queryParams.push(category);
        paramIndex++;
      }
      
      if (parentId) {
        query += ` AND parent_id = $${paramIndex}`;
        queryParams.push(parentId);
        paramIndex++;
      }
      
      query += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);
      
      const result = await pool.query(query, queryParams);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting tags:', error);
      throw new Error(`Failed to get tags: ${error.message}`);
    }
  }

  /**
   * Get tag categories
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Tag categories
   */
  static async getCategories(tenantId) {
    try {
      const query = `
        SELECT DISTINCT category
        FROM tags
        WHERE tenant_id = $1 AND category IS NOT NULL
        ORDER BY category
      `;
      
      const values = [tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.map(row => row.category);
    } catch (error) {
      logger.error('Error getting tag categories:', error);
      throw new Error(`Failed to get tag categories: ${error.message}`);
    }
  }

  /**
   * Get popular tags
   * @param {number} limit - Maximum number of results
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Popular tags
   */
  static async getPopular(limit = 20, tenantId) {
    try {
      const query = `
        SELECT t.id, t.name, t.description, t.category, t.color, t.parent_id,
               t.created_at, t.updated_at, t.tenant_id, COUNT(rt.recipe_id) as usage_count
        FROM tags t
        JOIN recipe_tags rt ON t.id = rt.tag_id
        WHERE t.tenant_id = $1
        GROUP BY t.id
        ORDER BY usage_count DESC
        LIMIT $2
      `;
      
      const values = [tenantId, limit];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting popular tags:', error);
      throw new Error(`Failed to get popular tags: ${error.message}`);
    }
  }

  /**
   * Get tags for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Tags
   */
  static async getByRecipeId(recipeId, tenantId) {
    try {
      const query = `
        SELECT t.id, t.name, t.description, t.category, t.color, t.parent_id,
               t.created_at, t.updated_at, t.tenant_id
        FROM tags t
        JOIN recipe_tags rt ON t.id = rt.tag_id
        WHERE rt.recipe_id = $1 AND t.tenant_id = $2
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
   * Update a tag
   * @param {string} id - Tag ID
   * @param {Object} data - Tag data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated tag
   */
  static async update(id, data, tenantId) {
    const { name, description, category, color, parentId } = data;
    const updatedAt = new Date();

    try {
      // Build dynamic update query based on provided fields
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      
      if (category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        values.push(category);
      }
      
      if (color !== undefined) {
        updates.push(`color = $${paramIndex++}`);
        values.push(color);
      }
      
      if (parentId !== undefined) {
        updates.push(`parent_id = $${paramIndex++}`);
        values.push(parentId);
      }
      
      updates.push(`updated_at = $${paramIndex++}`);
      values.push(updatedAt);
      
      // Add id and tenantId to values
      values.push(id, tenantId);
      
      const query = `
        UPDATE tags
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        RETURNING id, name, description, category, color, parent_id,
                  created_at, updated_at, tenant_id
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating tag ${id}:`, error);
      throw new Error(`Failed to update tag: ${error.message}`);
    }
  }

  /**
   * Delete a tag
   * @param {string} id - Tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Delete tag associations
      const deleteAssociationsQuery = `
        DELETE FROM recipe_tags
        WHERE tag_id = $1 AND tenant_id = $2
      `;
      
      await pool.query(deleteAssociationsQuery, [id, tenantId]);
      
      // Delete tag
      const deleteTagQuery = `
        DELETE FROM tags
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const result = await pool.query(deleteTagQuery, [id, tenantId]);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return result.rows.length > 0;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error deleting tag ${id}:`, error);
      throw new Error(`Failed to delete tag: ${error.message}`);
    }
  }

  /**
   * Get related tags
   * @param {string} tagId - Tag ID
   * @param {number} limit - Maximum number of results
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Related tags
   */
  static async getRelated(tagId, limit = 10, tenantId) {
    try {
      // Get tags that appear together with the given tag on recipes
      const query = `
        SELECT t.id, t.name, t.description, t.category, t.color, t.parent_id,
               t.created_at, t.updated_at, t.tenant_id, COUNT(rt1.recipe_id) as co_occurrence
        FROM tags t
        JOIN recipe_tags rt1 ON t.id = rt1.tag_id
        JOIN recipe_tags rt2 ON rt1.recipe_id = rt2.recipe_id
        WHERE rt2.tag_id = $1 AND t.id != $1 AND t.tenant_id = $2
        GROUP BY t.id
        ORDER BY co_occurrence DESC
        LIMIT $3
      `;
      
      const values = [tagId, tenantId, limit];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting related tags for tag ${tagId}:`, error);
      throw new Error(`Failed to get related tags: ${error.message}`);
    }
  }

  /**
   * Get tag usage statistics
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Tag usage statistics
   */
  static async getUsageStats(tenantId) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT t.id) as total_tags,
          COUNT(DISTINCT rt.recipe_id) as tagged_recipes,
          AVG(tag_count.count) as avg_tags_per_recipe,
          MAX(tag_count.count) as max_tags_per_recipe
        FROM tags t
        LEFT JOIN recipe_tags rt ON t.id = rt.tag_id
        LEFT JOIN (
          SELECT recipe_id, COUNT(tag_id) as count
          FROM recipe_tags
          WHERE tenant_id = $1
          GROUP BY recipe_id
        ) tag_count ON 1=1
        WHERE t.tenant_id = $1
      `;
      
      const values = [tenantId];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting tag usage statistics:', error);
      throw new Error(`Failed to get tag usage statistics: ${error.message}`);
    }
  }

  /**
   * Merge tags
   * @param {string} sourceTagId - Source tag ID
   * @param {string} targetTagId - Target tag ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async mergeTags(sourceTagId, targetTagId, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Get recipes with the source tag
      const getRecipesQuery = `
        SELECT recipe_id
        FROM recipe_tags
        WHERE tag_id = $1 AND tenant_id = $2
      `;
      
      const recipesResult = await pool.query(getRecipesQuery, [sourceTagId, tenantId]);
      const recipeIds = recipesResult.rows.map(row => row.recipe_id);
      
      // For each recipe, add the target tag if it doesn't already have it
      for (const recipeId of recipeIds) {
        // Check if recipe already has target tag
        const checkQuery = `
          SELECT id
          FROM recipe_tags
          WHERE recipe_id = $1 AND tag_id = $2 AND tenant_id = $3
        `;
        
        const checkResult = await pool.query(checkQuery, [recipeId, targetTagId, tenantId]);
        
        if (checkResult.rows.length === 0) {
          // Add target tag to recipe
          const addTagQuery = `
            INSERT INTO recipe_tags (id, recipe_id, tag_id, created_at, updated_at, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
          
          const now = new Date();
          await pool.query(addTagQuery, [
            uuidv4(), recipeId, targetTagId, now, now, tenantId
          ]);
        }
      }
      
      // Delete source tag associations
      const deleteAssociationsQuery = `
        DELETE FROM recipe_tags
        WHERE tag_id = $1 AND tenant_id = $2
      `;
      
      await pool.query(deleteAssociationsQuery, [sourceTagId, tenantId]);
      
      // Delete source tag
      const deleteTagQuery = `
        DELETE FROM tags
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const result = await pool.query(deleteTagQuery, [sourceTagId, tenantId]);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return result.rows.length > 0;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error merging tags ${sourceTagId} into ${targetTagId}:`, error);
      throw new Error(`Failed to merge tags: ${error.message}`);
    }
  }

  /**
   * Get tag hierarchy
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Tag hierarchy
   */
  static async getHierarchy(tenantId) {
    try {
      // Get all tags
      const query = `
        SELECT id, name, description, category, color, parent_id,
               created_at, updated_at, tenant_id
        FROM tags
        WHERE tenant_id = $1
        ORDER BY name
      `;
      
      const values = [tenantId];
      const result = await pool.query(query, values);
      
      // Build hierarchy
      const tags = result.rows;
      const tagMap = {};
      const rootTags = [];
      
      // Create map of tags by ID
      for (const tag of tags) {
        tagMap[tag.id] = {
          ...tag,
          children: []
        };
      }
      
      // Build tree structure
      for (const tag of tags) {
        if (tag.parent_id && tagMap[tag.parent_id]) {
          tagMap[tag.parent_id].children.push(tagMap[tag.id]);
        } else {
          rootTags.push(tagMap[tag.id]);
        }
      }
      
      return rootTags;
    } catch (error) {
      logger.error('Error getting tag hierarchy:', error);
      throw new Error(`Failed to get tag hierarchy: ${error.message}`);
    }
  }

  /**
   * Generate tag suggestions for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Tag suggestions
   */
  static async generateSuggestions(recipeId, tenantId) {
    try {
      // This would normally use AI to generate tag suggestions
      // For now, return a placeholder implementation
      
      // Get recipe details
      const recipeQuery = `
        SELECT title, description, instructions
        FROM recipes
        WHERE id = $1 AND tenant_id = $2
      `;
      
      const recipeResult = await pool.query(recipeQuery, [recipeId, tenantId]);
      
      if (recipeResult.rows.length === 0) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      const recipe = recipeResult.rows[0];
      
      // Get existing tags for the recipe
      const existingTags = await this.getByRecipeId(recipeId, tenantId);
      const existingTagNames = existingTags.map(tag => tag.name);
      
      // Get popular tags
      const popularTags = await this.getPopular(50, tenantId);
      
      // Filter out existing tags and select relevant ones
      // In a real implementation, this would use AI to analyze the recipe
      const suggestions = popularTags
        .filter(tag => !existingTagNames.includes(tag.name))
        .slice(0, 10);
      
      return suggestions;
    } catch (error) {
      logger.error(`Error generating tag suggestions for recipe ${recipeId}:`, error);
      throw new Error(`Failed to generate tag suggestions: ${error.message}`);
    }
  }
}

module.exports = Tag;
