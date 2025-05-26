const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * CategoryGroup model
 * Represents a group of categories for organizing recipes
 */
class CategoryGroup {
  /**
   * Create a new category group
   * @param {Object} data - Category group data
   * @param {string} data.name - Category group name
   * @param {string} data.description - Category group description
   * @param {number} data.displayOrder - Display order for UI
   * @param {string} data.icon - Icon name
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created category group
   */
  static async create(data) {
    const { 
      name, 
      description = null, 
      displayOrder = 0, 
      icon = null, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO category_groups (
          id, name, description, display_order, icon,
          created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, description, display_order, icon,
                  created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, name, description, displayOrder, icon,
        createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating category group:', error);
      throw new Error(`Failed to create category group: ${error.message}`);
    }
  }

  /**
   * Get a category group by ID
   * @param {string} id - Category group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Category group
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, name, description, display_order, icon,
               created_at, updated_at, tenant_id
        FROM category_groups
        WHERE id = $1 AND tenant_id = $2
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting category group ${id}:`, error);
      throw new Error(`Failed to get category group: ${error.message}`);
    }
  }

  /**
   * Get a category group by name
   * @param {string} name - Category group name
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Category group
   */
  static async getByName(name, tenantId) {
    try {
      const query = `
        SELECT id, name, description, display_order, icon,
               created_at, updated_at, tenant_id
        FROM category_groups
        WHERE name = $1 AND tenant_id = $2
      `;
      
      const values = [name, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting category group by name ${name}:`, error);
      throw new Error(`Failed to get category group by name: ${error.message}`);
    }
  }

  /**
   * Get all category groups
   * @param {Object} options - Query options
   * @param {string} options.search - Search term
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Category groups
   */
  static async getAll(options = {}, tenantId) {
    const { search, limit = 100, offset = 0 } = options;
    
    try {
      let query = `
        SELECT id, name, description, display_order, icon,
               created_at, updated_at, tenant_id
        FROM category_groups
        WHERE tenant_id = $1
      `;
      
      const queryParams = [tenantId];
      let paramIndex = 2;
      
      if (search) {
        query += ` AND name ILIKE $${paramIndex}`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY display_order ASC, name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);
      
      const result = await pool.query(query, queryParams);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting category groups:', error);
      throw new Error(`Failed to get category groups: ${error.message}`);
    }
  }

  /**
   * Update a category group
   * @param {string} id - Category group ID
   * @param {Object} data - Category group data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated category group
   */
  static async update(id, data, tenantId) {
    const { name, description, displayOrder, icon } = data;
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
      
      if (displayOrder !== undefined) {
        updates.push(`display_order = $${paramIndex++}`);
        values.push(displayOrder);
      }
      
      if (icon !== undefined) {
        updates.push(`icon = $${paramIndex++}`);
        values.push(icon);
      }
      
      updates.push(`updated_at = $${paramIndex++}`);
      values.push(updatedAt);
      
      // Add id and tenantId to values
      values.push(id, tenantId);
      
      const query = `
        UPDATE category_groups
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        RETURNING id, name, description, display_order, icon,
                  created_at, updated_at, tenant_id
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating category group ${id}:`, error);
      throw new Error(`Failed to update category group: ${error.message}`);
    }
  }

  /**
   * Delete a category group
   * @param {string} id - Category group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Delete category group
      const deleteQuery = `
        DELETE FROM category_groups
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
      logger.error(`Error deleting category group ${id}:`, error);
      throw new Error(`Failed to delete category group: ${error.message}`);
    }
  }

  /**
   * Get category groups with their categories
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Category groups with categories
   */
  static async getAllWithCategories(tenantId) {
    try {
      // Get all category groups
      const groupsQuery = `
        SELECT id, name, description, display_order, icon,
               created_at, updated_at, tenant_id
        FROM category_groups
        WHERE tenant_id = $1
        ORDER BY display_order ASC, name ASC
      `;
      
      const groupsResult = await pool.query(groupsQuery, [tenantId]);
      const groups = groupsResult.rows;
      
      // Get all categories
      const categoriesQuery = `
        SELECT id, name, description, category_group_id, parent_id,
               display_order, icon, color, is_default,
               created_at, updated_at, tenant_id
        FROM categories
        WHERE tenant_id = $1
        ORDER BY display_order ASC, name ASC
      `;
      
      const categoriesResult = await pool.query(categoriesQuery, [tenantId]);
      const categories = categoriesResult.rows;
      
      // Group categories by category_group_id
      const categoriesByGroup = {};
      for (const category of categories) {
        if (!categoriesByGroup[category.category_group_id]) {
          categoriesByGroup[category.category_group_id] = [];
        }
        categoriesByGroup[category.category_group_id].push(category);
      }
      
      // Add categories to each group
      for (const group of groups) {
        group.categories = categoriesByGroup[group.id] || [];
      }
      
      return groups;
    } catch (error) {
      logger.error('Error getting category groups with categories:', error);
      throw new Error(`Failed to get category groups with categories: ${error.message}`);
    }
  }

  /**
   * Reorder category groups
   * @param {Array} groupIds - Ordered array of category group IDs
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async reorder(groupIds, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Update display_order for each group
      for (let i = 0; i < groupIds.length; i++) {
        const updateQuery = `
          UPDATE category_groups
          SET display_order = $1, updated_at = $2
          WHERE id = $3 AND tenant_id = $4
        `;
        
        await pool.query(updateQuery, [i, new Date(), groupIds[i], tenantId]);
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return true;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error('Error reordering category groups:', error);
      throw new Error(`Failed to reorder category groups: ${error.message}`);
    }
  }
}

module.exports = CategoryGroup;
