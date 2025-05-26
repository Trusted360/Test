const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * Ingredient model for handling ingredients
 */
class Ingredient {
  /**
   * Get an ingredient by ID
   * @param {string} id - Ingredient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Ingredient
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, name, category, store_section, category_id, 
               created_at, updated_at, tenant_id
        FROM ingredients
        WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting ingredient ${id}:`, error);
      throw new Error(`Failed to get ingredient: ${error.message}`);
    }
  }

  /**
   * Get an ingredient by name
   * @param {string} name - Ingredient name
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Ingredient
   */
  static async getByName(name, tenantId) {
    try {
      const query = `
        SELECT id, name, category, store_section, category_id, 
               created_at, updated_at, tenant_id
        FROM ingredients
        WHERE name ILIKE $1 AND (tenant_id = $2 OR tenant_id IS NULL)
        ORDER BY tenant_id NULLS LAST
        LIMIT 1
      `;
      
      const values = [name, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting ingredient by name ${name}:`, error);
      throw new Error(`Failed to get ingredient by name: ${error.message}`);
    }
  }

  /**
   * Search ingredients by name
   * @param {string} query - Search query
   * @param {string} tenantId - Tenant ID
   * @param {number} limit - Max number of results to return
   * @returns {Promise<Array>} Ingredients
   */
  static async search(query, tenantId, limit = 20) {
    try {
      const searchQuery = `
        SELECT id, name, category, store_section, category_id, 
               created_at, updated_at, tenant_id
        FROM ingredients
        WHERE 
          (name ILIKE $1 OR $1 IS NULL) AND
          (tenant_id = $2 OR tenant_id IS NULL)
        ORDER BY 
          CASE WHEN name ILIKE $3 THEN 0
               WHEN name ILIKE $4 THEN 1
               ELSE 2
          END,
          name
        LIMIT $5
      `;
      
      const searchParam = query ? `%${query}%` : null;
      const exactMatch = query ? `${query}` : '';
      const startsWithMatch = query ? `${query}%` : '';
      
      const values = [searchParam, tenantId, exactMatch, startsWithMatch, limit];
      const result = await pool.query(searchQuery, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error searching ingredients with query "${query}":`, error);
      throw new Error(`Failed to search ingredients: ${error.message}`);
    }
  }

  /**
   * Get all ingredients
   * @param {string} tenantId - Tenant ID
   * @param {number} limit - Max number of results to return
   * @param {number} offset - Number of results to skip
   * @returns {Promise<Array>} Ingredients
   */
  static async getAll(tenantId, limit = 100, offset = 0) {
    try {
      const query = `
        SELECT id, name, category, store_section, category_id, 
               created_at, updated_at, tenant_id
        FROM ingredients
        WHERE tenant_id = $1 OR tenant_id IS NULL
        ORDER BY name
        LIMIT $2 OFFSET $3
      `;
      
      const values = [tenantId, limit, offset];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting all ingredients:', error);
      throw new Error(`Failed to get ingredients: ${error.message}`);
    }
  }

  /**
   * Get ingredients by category
   * @param {string} category - Ingredient category
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Ingredients
   */
  static async getByCategory(category, tenantId) {
    try {
      const query = `
        SELECT id, name, category, store_section, category_id, 
               created_at, updated_at, tenant_id
        FROM ingredients
        WHERE category = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
        ORDER BY name
      `;
      
      const values = [category, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting ingredients by category ${category}:`, error);
      throw new Error(`Failed to get ingredients by category: ${error.message}`);
    }
  }

  /**
   * Create a new ingredient
   * @param {Object} data - Ingredient data
   * @param {string} data.name - Ingredient name
   * @param {string} data.category - Ingredient category
   * @param {string} data.storeSection - Store section
   * @param {string} data.categoryId - Category ID
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created ingredient
   */
  static async create(data) {
    const { 
      name, 
      category, 
      storeSection, 
      categoryId,
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO ingredients (
          id, name, category, store_section, category_id, 
          created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, category, store_section, category_id, 
                  created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, name, category, storeSection, categoryId,
        createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating ingredient:', error);
      throw new Error(`Failed to create ingredient: ${error.message}`);
    }
  }

  /**
   * Update an ingredient
   * @param {string} id - Ingredient ID
   * @param {Object} data - Ingredient data
   * @param {string} data.name - Ingredient name
   * @param {string} data.category - Ingredient category
   * @param {string} data.storeSection - Store section
   * @param {string} data.categoryId - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated ingredient
   */
  static async update(id, data, tenantId) {
    const { name, category, storeSection, categoryId } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE ingredients
        SET name = COALESCE($1, name),
            category = COALESCE($2, category),
            store_section = COALESCE($3, store_section),
            category_id = COALESCE($4, category_id),
            updated_at = $5
        WHERE id = $6 AND tenant_id = $7
        RETURNING id, name, category, store_section, category_id, 
                  created_at, updated_at, tenant_id
      `;
      
      const values = [
        name, category, storeSection, categoryId,
        updatedAt, id, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating ingredient ${id}:`, error);
      throw new Error(`Failed to update ingredient: ${error.message}`);
    }
  }

  /**
   * Delete an ingredient
   * @param {string} id - Ingredient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  static async delete(id, tenantId) {
    try {
      // First check if the ingredient is used in any recipes
      const checkQuery = `
        SELECT 1 FROM recipe_ingredients 
        WHERE ingredient_id = $1 AND tenant_id = $2
        LIMIT 1
      `;
      
      const checkValues = [id, tenantId];
      const checkResult = await pool.query(checkQuery, checkValues);
      
      if (checkResult.rows.length > 0) {
        throw new Error('Cannot delete ingredient that is used in recipes');
      }
      
      // Also check if it's in any pantry items
      const pantryCheckQuery = `
        SELECT 1 FROM pantry_items 
        WHERE ingredient_id = $1 AND tenant_id = $2
        LIMIT 1
      `;
      
      const pantryCheckResult = await pool.query(pantryCheckQuery, checkValues);
      
      if (pantryCheckResult.rows.length > 0) {
        throw new Error('Cannot delete ingredient that is in pantry');
      }
      
      // If not used anywhere, delete it
      const deleteQuery = `
        DELETE FROM ingredients
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const result = await pool.query(deleteQuery, [id, tenantId]);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting ingredient ${id}:`, error);
      throw new Error(`Failed to delete ingredient: ${error.message}`);
    }
  }

  /**
   * Get or create an ingredient by name
   * @param {string} name - Ingredient name
   * @param {string} tenantId - Tenant ID
   * @param {Object} additionalData - Additional data if creating
   * @returns {Promise<Object>} Ingredient
   */
  static async getOrCreate(name, tenantId, additionalData = {}) {
    try {
      // First try to get by name
      const existing = await this.getByName(name, tenantId);
      
      if (existing) {
        return existing;
      }
      
      // If not found, create new
      return await this.create({
        name,
        category: additionalData.category || null,
        storeSection: additionalData.storeSection || null,
        categoryId: additionalData.categoryId || null,
        tenantId
      });
    } catch (error) {
      logger.error(`Error in getOrCreate for ingredient '${name}':`, error);
      throw new Error(`Failed to get or create ingredient: ${error.message}`);
    }
  }
}

module.exports = Ingredient; 