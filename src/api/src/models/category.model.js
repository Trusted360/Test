const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * Category model
 * Represents a category for organizing recipes
 */
class Category {
  /**
   * Create a new category
   * @param {Object} data - Category data
   * @param {string} data.name - Category name
   * @param {string} data.description - Category description
   * @param {string} data.categoryGroupId - Category group ID
   * @param {string} data.parentId - Parent category ID (for hierarchical categories)
   * @param {number} data.displayOrder - Display order for UI
   * @param {string} data.icon - Icon name
   * @param {string} data.color - Color code
   * @param {boolean} data.isDefault - Whether this is a default category
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created category
   */
  static async create(data) {
    const { 
      name, 
      description = null, 
      categoryGroupId, 
      parentId = null, 
      displayOrder = 0, 
      icon = null, 
      color = null, 
      isDefault = false, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO categories (
          id, name, description, category_group_id, parent_id,
          display_order, icon, color, is_default,
          created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, name, description, category_group_id, parent_id,
                  display_order, icon, color, is_default,
                  created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, name, description, categoryGroupId, parentId,
        displayOrder, icon, color, isDefault,
        createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating category:', error);
      throw new Error(`Failed to create category: ${error.message}`);
    }
  }

  /**
   * Get a category by ID
   * @param {string} id - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Category
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT c.id, c.name, c.description, c.category_group_id, c.parent_id,
               c.display_order, c.icon, c.color, c.is_default,
               c.created_at, c.updated_at, c.tenant_id,
               cg.name as category_group_name
        FROM categories c
        JOIN category_groups cg ON c.category_group_id = cg.id
        WHERE c.id = $1 AND c.tenant_id = $2
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting category ${id}:`, error);
      throw new Error(`Failed to get category: ${error.message}`);
    }
  }

  /**
   * Get a category by name and group
   * @param {string} name - Category name
   * @param {string} categoryGroupId - Category group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Category
   */
  static async getByNameAndGroup(name, categoryGroupId, tenantId) {
    try {
      const query = `
        SELECT c.id, c.name, c.description, c.category_group_id, c.parent_id,
               c.display_order, c.icon, c.color, c.is_default,
               c.created_at, c.updated_at, c.tenant_id,
               cg.name as category_group_name
        FROM categories c
        JOIN category_groups cg ON c.category_group_id = cg.id
        WHERE c.name = $1 AND c.category_group_id = $2 AND c.tenant_id = $3
      `;
      
      const values = [name, categoryGroupId, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting category by name ${name} and group ${categoryGroupId}:`, error);
      throw new Error(`Failed to get category by name and group: ${error.message}`);
    }
  }

  /**
   * Get all categories
   * @param {Object} options - Query options
   * @param {string} options.search - Search term
   * @param {string} options.categoryGroupId - Filter by category group ID
   * @param {string} options.parentId - Filter by parent ID
   * @param {boolean} options.isDefault - Filter by default status
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Categories
   */
  static async getAll(options = {}, tenantId) {
    const { 
      search, 
      categoryGroupId, 
      parentId, 
      isDefault, 
      limit = 100, 
      offset = 0 
    } = options;
    
    try {
      let query = `
        SELECT c.id, c.name, c.description, c.category_group_id, c.parent_id,
               c.display_order, c.icon, c.color, c.is_default,
               c.created_at, c.updated_at, c.tenant_id,
               cg.name as category_group_name
        FROM categories c
        JOIN category_groups cg ON c.category_group_id = cg.id
        WHERE c.tenant_id = $1
      `;
      
      const queryParams = [tenantId];
      let paramIndex = 2;
      
      if (search) {
        query += ` AND c.name ILIKE $${paramIndex}`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      if (categoryGroupId) {
        query += ` AND c.category_group_id = $${paramIndex}`;
        queryParams.push(categoryGroupId);
        paramIndex++;
      }
      
      if (parentId !== undefined) {
        if (parentId === null) {
          query += ` AND c.parent_id IS NULL`;
        } else {
          query += ` AND c.parent_id = $${paramIndex}`;
          queryParams.push(parentId);
          paramIndex++;
        }
      }
      
      if (isDefault !== undefined) {
        query += ` AND c.is_default = $${paramIndex}`;
        queryParams.push(isDefault);
        paramIndex++;
      }
      
      query += ` ORDER BY c.display_order ASC, c.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);
      
      const result = await pool.query(query, queryParams);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting categories:', error);
      throw new Error(`Failed to get categories: ${error.message}`);
    }
  }

  /**
   * Update a category
   * @param {string} id - Category ID
   * @param {Object} data - Category data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated category
   */
  static async update(id, data, tenantId) {
    const { 
      name, 
      description, 
      categoryGroupId, 
      parentId, 
      displayOrder, 
      icon, 
      color, 
      isDefault 
    } = data;
    
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
      
      if (categoryGroupId !== undefined) {
        updates.push(`category_group_id = $${paramIndex++}`);
        values.push(categoryGroupId);
      }
      
      if (parentId !== undefined) {
        updates.push(`parent_id = $${paramIndex++}`);
        values.push(parentId);
      }
      
      if (displayOrder !== undefined) {
        updates.push(`display_order = $${paramIndex++}`);
        values.push(displayOrder);
      }
      
      if (icon !== undefined) {
        updates.push(`icon = $${paramIndex++}`);
        values.push(icon);
      }
      
      if (color !== undefined) {
        updates.push(`color = $${paramIndex++}`);
        values.push(color);
      }
      
      if (isDefault !== undefined) {
        updates.push(`is_default = $${paramIndex++}`);
        values.push(isDefault);
      }
      
      updates.push(`updated_at = $${paramIndex++}`);
      values.push(updatedAt);
      
      // Add id and tenantId to values
      values.push(id, tenantId);
      
      const query = `
        UPDATE categories
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        RETURNING id, name, description, category_group_id, parent_id,
                  display_order, icon, color, is_default,
                  created_at, updated_at, tenant_id
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating category ${id}:`, error);
      throw new Error(`Failed to update category: ${error.message}`);
    }
  }

  /**
   * Delete a category
   * @param {string} id - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Delete category
      const deleteQuery = `
        DELETE FROM categories
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const result = await pool.query(deleteQuery, [id, tenantId]);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return result.rows.length > 0;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error deleting category ${id}:`, error);
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  /**
   * Get categories for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Categories
   */
  static async getByRecipeId(recipeId, tenantId) {
    try {
      const query = `
        SELECT c.id, c.name, c.description, c.category_group_id, c.parent_id,
               c.display_order, c.icon, c.color, c.is_default,
               c.created_at, c.updated_at, c.tenant_id,
               cg.name as category_group_name
        FROM categories c
        JOIN recipe_categories rc ON c.id = rc.category_id
        JOIN category_groups cg ON c.category_group_id = cg.id
        WHERE rc.recipe_id = $1 AND c.tenant_id = $2
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
   * Get default categories
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Default categories
   */
  static async getDefaults(tenantId) {
    try {
      const query = `
        SELECT c.id, c.name, c.description, c.category_group_id, c.parent_id,
               c.display_order, c.icon, c.color, c.is_default,
               c.created_at, c.updated_at, c.tenant_id,
               cg.name as category_group_name
        FROM categories c
        JOIN category_groups cg ON c.category_group_id = cg.id
        WHERE c.is_default = true AND c.tenant_id = $1
        ORDER BY cg.display_order ASC, c.display_order ASC, c.name ASC
      `;
      
      const values = [tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting default categories:', error);
      throw new Error(`Failed to get default categories: ${error.message}`);
    }
  }

  /**
   * Get category hierarchy
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Category hierarchy
   */
  static async getHierarchy(tenantId) {
    try {
      // Get all categories
      const query = `
        SELECT c.id, c.name, c.description, c.category_group_id, c.parent_id,
               c.display_order, c.icon, c.color, c.is_default,
               c.created_at, c.updated_at, c.tenant_id,
               cg.name as category_group_name
        FROM categories c
        JOIN category_groups cg ON c.category_group_id = cg.id
        WHERE c.tenant_id = $1
        ORDER BY cg.display_order ASC, c.display_order ASC, c.name ASC
      `;
      
      const values = [tenantId];
      const result = await pool.query(query, values);
      
      // Build hierarchy
      const categories = result.rows;
      const categoryMap = {};
      const rootCategories = [];
      
      // Create map of categories by ID
      for (const category of categories) {
        categoryMap[category.id] = {
          ...category,
          children: []
        };
      }
      
      // Build tree structure
      for (const category of categories) {
        if (category.parent_id && categoryMap[category.parent_id]) {
          categoryMap[category.parent_id].children.push(categoryMap[category.id]);
        } else {
          rootCategories.push(categoryMap[category.id]);
        }
      }
      
      return rootCategories;
    } catch (error) {
      logger.error('Error getting category hierarchy:', error);
      throw new Error(`Failed to get category hierarchy: ${error.message}`);
    }
  }

  /**
   * Reorder categories within a group
   * @param {string} categoryGroupId - Category group ID
   * @param {Array} categoryIds - Ordered array of category IDs
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async reorder(categoryGroupId, categoryIds, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Update display_order for each category
      for (let i = 0; i < categoryIds.length; i++) {
        const updateQuery = `
          UPDATE categories
          SET display_order = $1, updated_at = $2
          WHERE id = $3 AND category_group_id = $4 AND tenant_id = $5
        `;
        
        await pool.query(updateQuery, [
          i, new Date(), categoryIds[i], categoryGroupId, tenantId
        ]);
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return true;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error('Error reordering categories:', error);
      throw new Error(`Failed to reorder categories: ${error.message}`);
    }
  }

  /**
   * Get recipes by category
   * @param {string} categoryId - Category ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipes
   */
  static async getRecipes(categoryId, options = {}, tenantId) {
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
  static async countRecipes(categoryId, tenantId) {
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
}

module.exports = Category;
