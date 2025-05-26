const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * StoreSection model for managing store sections
 */
class StoreSection {
  /**
   * Get a store section by ID
   * @param {string} id - Store section ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Store section
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, name, display_order, created_at, updated_at, tenant_id
        FROM store_sections
        WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting store section ${id}:`, error);
      throw new Error(`Failed to get store section: ${error.message}`);
    }
  }

  /**
   * Get a store section by name
   * @param {string} name - Store section name
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Store section
   */
  static async getByName(name, tenantId) {
    try {
      const query = `
        SELECT id, name, display_order, created_at, updated_at, tenant_id
        FROM store_sections
        WHERE name = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
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
      logger.error(`Error getting store section by name ${name}:`, error);
      throw new Error(`Failed to get store section by name: ${error.message}`);
    }
  }

  /**
   * Get all store sections
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Store sections
   */
  static async getAll(tenantId) {
    try {
      const query = `
        SELECT id, name, display_order, created_at, updated_at, tenant_id
        FROM store_sections
        WHERE tenant_id = $1 OR tenant_id IS NULL
        ORDER BY display_order, name
      `;
      
      const values = [tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting all store sections:', error);
      throw new Error(`Failed to get store sections: ${error.message}`);
    }
  }

  /**
   * Create a new store section
   * @param {Object} data - Store section data
   * @param {string} data.name - Store section name
   * @param {number} data.displayOrder - Display order
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created store section
   */
  static async create(data) {
    const { name, displayOrder, tenantId } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO store_sections (
          id, name, display_order, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, display_order, created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, name, displayOrder, createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating store section:', error);
      throw new Error(`Failed to create store section: ${error.message}`);
    }
  }

  /**
   * Update a store section
   * @param {string} id - Store section ID
   * @param {Object} data - Store section data
   * @param {string} data.name - Store section name
   * @param {number} data.displayOrder - Display order
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated store section
   */
  static async update(id, data, tenantId) {
    const { name, displayOrder } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE store_sections
        SET name = $1, display_order = $2, updated_at = $3
        WHERE id = $4 AND tenant_id = $5
        RETURNING id, name, display_order, created_at, updated_at, tenant_id
      `;
      
      const values = [
        name, displayOrder, updatedAt, id, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating store section ${id}:`, error);
      throw new Error(`Failed to update store section: ${error.message}`);
    }
  }

  /**
   * Delete a store section
   * @param {string} id - Store section ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM store_sections
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting store section ${id}:`, error);
      throw new Error(`Failed to delete store section: ${error.message}`);
    }
  }

  /**
   * Get or create a store section by name
   * @param {string} name - Store section name
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Store section
   */
  static async getOrCreate(name, tenantId) {
    try {
      // Try to get existing store section
      const existingSection = await StoreSection.getByName(name, tenantId);
      
      if (existingSection) {
        return existingSection;
      }
      
      // If not found, create a new one
      // Get the highest display order
      const query = `
        SELECT MAX(display_order) as max_order
        FROM store_sections
        WHERE tenant_id = $1 OR tenant_id IS NULL
      `;
      
      const values = [tenantId];
      const result = await pool.query(query, values);
      
      const maxOrder = result.rows[0].max_order || 0;
      const newDisplayOrder = maxOrder + 10;
      
      // Create new store section
      return await StoreSection.create({
        name,
        displayOrder: newDisplayOrder,
        tenantId
      });
    } catch (error) {
      logger.error(`Error getting or creating store section ${name}:`, error);
      throw new Error(`Failed to get or create store section: ${error.message}`);
    }
  }

  /**
   * Get the best store section for an ingredient
   * @param {string} ingredientId - Ingredient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Store section
   */
  static async getBestSectionForIngredient(ingredientId, tenantId) {
    try {
      // First check if the ingredient has a category that maps to a store section
      const query = `
        SELECT i.category
        FROM ingredients i
        WHERE i.id = $1 AND (i.tenant_id = $2 OR i.tenant_id IS NULL)
      `;
      
      const values = [ingredientId, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        // Ingredient not found, return default section
        return await StoreSection.getByName('Other', tenantId);
      }
      
      const category = result.rows[0].category;
      
      if (!category) {
        // No category, return default section
        return await StoreSection.getByName('Other', tenantId);
      }
      
      // Try to find a store section with a matching name
      const section = await StoreSection.getByName(category, tenantId);
      
      if (section) {
        return section;
      }
      
      // If no exact match, try to find a section that contains the category name
      const sectionQuery = `
        SELECT id, name, display_order, created_at, updated_at, tenant_id
        FROM store_sections
        WHERE (tenant_id = $1 OR tenant_id IS NULL)
          AND (
            $2 ILIKE '%' || name || '%' 
            OR name ILIKE '%' || $2 || '%'
          )
        ORDER BY tenant_id NULLS LAST, display_order
        LIMIT 1
      `;
      
      const sectionValues = [tenantId, category];
      const sectionResult = await pool.query(sectionQuery, sectionValues);
      
      if (sectionResult.rows.length > 0) {
        return sectionResult.rows[0];
      }
      
      // No matching section found, return default section
      return await StoreSection.getByName('Other', tenantId);
    } catch (error) {
      logger.error(`Error getting best section for ingredient ${ingredientId}:`, error);
      throw new Error(`Failed to get best section for ingredient: ${error.message}`);
    }
  }
}

module.exports = StoreSection;
