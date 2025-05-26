const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');
const Ingredient = require('./ingredient.model');
const Unit = require('./unit.model');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * PantryItem model for handling user's ingredient inventory
 */
class PantryItem {
  /**
   * Get a pantry item by ID
   * @param {string} id - Pantry item ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Pantry item
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT p.id, p.household_id, p.ingredient_id, p.quantity, p.unit_id, 
               p.expiry_date, p.notes, p.created_at, p.updated_at, p.tenant_id,
               i.name as ingredient_name, i.category as ingredient_category,
               u.name as unit_name, u.symbol as unit_symbol
        FROM pantry_items p
        JOIN ingredients i ON p.ingredient_id = i.id
        LEFT JOIN units u ON p.unit_id = u.id
        WHERE p.id = $1 AND p.tenant_id = $2
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting pantry item ${id}:`, error);
      throw new Error(`Failed to get pantry item: ${error.message}`);
    }
  }

  /**
   * Get all pantry items for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Pantry items
   */
  static async getByHousehold(householdId, tenantId) {
    try {
      const query = `
        SELECT p.id, p.household_id, p.ingredient_id, p.quantity, p.unit_id, 
               p.expiry_date, p.notes, p.created_at, p.updated_at, p.tenant_id,
               i.name as ingredient_name, i.category as ingredient_category,
               u.name as unit_name, u.symbol as unit_symbol
        FROM pantry_items p
        JOIN ingredients i ON p.ingredient_id = i.id
        LEFT JOIN units u ON p.unit_id = u.id
        WHERE p.household_id = $1 AND p.tenant_id = $2
        ORDER BY i.category, i.name
      `;
      
      const values = [householdId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting pantry items for household ${householdId}:`, error);
      throw new Error(`Failed to get pantry items: ${error.message}`);
    }
  }

  /**
   * Get expiring ingredients for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @param {number} daysThreshold - Number of days to look ahead
   * @returns {Promise<Array>} Expiring pantry items
   */
  static async getExpiring(householdId, tenantId, daysThreshold = 7) {
    try {
      const query = `
        SELECT p.id, p.household_id, p.ingredient_id, p.quantity, p.unit_id, 
               p.expiry_date, p.notes, p.created_at, p.updated_at, p.tenant_id,
               i.name as ingredient_name, i.category as ingredient_category,
               u.name as unit_name, u.symbol as unit_symbol
        FROM pantry_items p
        JOIN ingredients i ON p.ingredient_id = i.id
        LEFT JOIN units u ON p.unit_id = u.id
        WHERE p.household_id = $1 
          AND p.tenant_id = $2
          AND p.expiry_date IS NOT NULL
          AND p.expiry_date > CURRENT_DATE
          AND p.expiry_date <= CURRENT_DATE + $3 * INTERVAL '1 day'
        ORDER BY p.expiry_date ASC, i.name ASC
      `;
      
      const values = [householdId, tenantId, daysThreshold];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting expiring items for household ${householdId}:`, error);
      throw new Error(`Failed to get expiring pantry items: ${error.message}`);
    }
  }

  /**
   * Create a new pantry item
   * @param {Object} data - Pantry item data
   * @param {string} data.householdId - Household ID
   * @param {string} data.ingredientId - Ingredient ID
   * @param {string} data.ingredientName - Ingredient name (used if ingredientId not provided)
   * @param {number} data.quantity - Quantity
   * @param {string} data.unitId - Unit ID
   * @param {Date} data.expiryDate - Expiry date
   * @param {string} data.notes - Notes
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created pantry item
   */
  static async create(data) {
    const { 
      householdId, 
      ingredientId, 
      ingredientName, 
      quantity, 
      unitId, 
      expiryDate, 
      notes, 
      tenantId 
    } = data;
    
    // Start a transaction to ensure data consistency
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get or create ingredient if needed
      let finalIngredientId = ingredientId;
      if (!finalIngredientId && ingredientName) {
        const ingredient = await Ingredient.getOrCreate(ingredientName, tenantId);
        finalIngredientId = ingredient.id;
      }
      
      if (!finalIngredientId) {
        throw new Error('Either ingredientId or ingredientName must be provided');
      }
      
      // Check if this household already has this ingredient
      const existingQuery = `
        SELECT id FROM pantry_items
        WHERE household_id = $1 AND ingredient_id = $2 AND tenant_id = $3
      `;
      
      const existingValues = [householdId, finalIngredientId, tenantId];
      const existingResult = await client.query(existingQuery, existingValues);
      
      if (existingResult.rows.length > 0) {
        // If it exists, update it instead
        await client.query('ROLLBACK');
        return await this.update(existingResult.rows[0].id, {
          quantity, unitId, expiryDate, notes
        }, tenantId);
      }
      
      const id = uuidv4();
      const createdAt = new Date();
      const updatedAt = createdAt;
      
      const query = `
        INSERT INTO pantry_items (
          id, household_id, ingredient_id, quantity, unit_id, 
          expiry_date, notes, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      
      const values = [
        id, householdId, finalIngredientId, quantity, unitId, 
        expiryDate, notes, createdAt, updatedAt, tenantId
      ];
      
      await client.query(query, values);
      
      await client.query('COMMIT');
      
      // Get the full pantry item with ingredient details
      return await this.getById(id, tenantId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating pantry item:', error);
      throw new Error(`Failed to create pantry item: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update a pantry item
   * @param {string} id - Pantry item ID
   * @param {Object} data - Pantry item data
   * @param {number} data.quantity - Quantity
   * @param {string} data.unitId - Unit ID
   * @param {Date} data.expiryDate - Expiry date
   * @param {string} data.notes - Notes
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated pantry item
   */
  static async update(id, data, tenantId) {
    const { quantity, unitId, expiryDate, notes } = data;
    const updatedAt = new Date();

    try {
      // Only update fields that are provided
      const updateFields = [];
      const values = [];
      let valueIndex = 1;
      
      if (quantity !== undefined) {
        updateFields.push(`quantity = $${valueIndex}`);
        values.push(quantity);
        valueIndex++;
      }
      
      if (unitId !== undefined) {
        updateFields.push(`unit_id = $${valueIndex}`);
        values.push(unitId);
        valueIndex++;
      }
      
      if (expiryDate !== undefined) {
        updateFields.push(`expiry_date = $${valueIndex}`);
        values.push(expiryDate);
        valueIndex++;
      }
      
      if (notes !== undefined) {
        updateFields.push(`notes = $${valueIndex}`);
        values.push(notes);
        valueIndex++;
      }
      
      updateFields.push(`updated_at = $${valueIndex}`);
      values.push(updatedAt);
      valueIndex++;
      
      // Add WHERE clause values
      values.push(id);
      values.push(tenantId);
      
      const query = `
        UPDATE pantry_items
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex - 2} AND tenant_id = $${valueIndex - 1}
        RETURNING id
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return await this.getById(id, tenantId);
    } catch (error) {
      logger.error(`Error updating pantry item ${id}:`, error);
      throw new Error(`Failed to update pantry item: ${error.message}`);
    }
  }

  /**
   * Delete a pantry item
   * @param {string} id - Pantry item ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM pantry_items
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting pantry item ${id}:`, error);
      throw new Error(`Failed to delete pantry item: ${error.message}`);
    }
  }

  /**
   * Bulk add pantry items
   * @param {Array<Object>} items - Array of pantry items to add
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Created pantry items
   */
  static async bulkAdd(items, householdId, tenantId) {
    // Start a transaction to ensure data consistency
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const createdItems = [];
      
      for (const item of items) {
        const pantryItem = await this.create({
          ...item,
          householdId,
          tenantId
        });
        
        createdItems.push(pantryItem);
      }
      
      await client.query('COMMIT');
      
      return createdItems;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error bulk adding pantry items:', error);
      throw new Error(`Failed to bulk add pantry items: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Check if household has enough of an ingredient
   * @param {string} householdId - Household ID
   * @param {string} ingredientId - Ingredient ID
   * @param {number} requiredQuantity - Required quantity
   * @param {string} requiredUnitId - Required unit ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if enough is available
   */
  static async hasEnough(householdId, ingredientId, requiredQuantity, requiredUnitId, tenantId) {
    try {
      // Get the pantry item
      const query = `
        SELECT p.quantity, p.unit_id
        FROM pantry_items p
        WHERE p.household_id = $1 AND p.ingredient_id = $2 AND p.tenant_id = $3
      `;
      
      const values = [householdId, ingredientId, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return false; // Ingredient not in pantry
      }
      
      const pantryItem = result.rows[0];
      
      // If units match, simple comparison
      if (pantryItem.unit_id === requiredUnitId) {
        return pantryItem.quantity >= requiredQuantity;
      }
      
      // If units don't match, need to convert
      try {
        const convertedQuantity = await Unit.convert(
          requiredQuantity, 
          requiredUnitId, 
          pantryItem.unit_id, 
          tenantId
        );
        
        return pantryItem.quantity >= convertedQuantity;
      } catch (conversionError) {
        logger.warn(`Unit conversion failed: ${conversionError.message}`);
        return false; // Cannot determine if enough without conversion
      }
    } catch (error) {
      logger.error(`Error checking ingredient availability:`, error);
      throw new Error(`Failed to check ingredient availability: ${error.message}`);
    }
  }
}

module.exports = PantryItem; 