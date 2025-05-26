const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * Unit model for handling measurement units and conversions
 */
class Unit {
  /**
   * Get a unit by ID
   * @param {string} id - Unit ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Unit
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT id, name, symbol, category, base_unit_id, conversion_factor, 
               created_at, updated_at, tenant_id
        FROM units
        WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting unit ${id}:`, error);
      throw new Error(`Failed to get unit: ${error.message}`);
    }
  }

  /**
   * Get a unit by name
   * @param {string} name - Unit name
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Unit
   */
  static async getByName(name, tenantId) {
    try {
      const query = `
        SELECT id, name, symbol, category, base_unit_id, conversion_factor, 
               created_at, updated_at, tenant_id
        FROM units
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
      logger.error(`Error getting unit by name ${name}:`, error);
      throw new Error(`Failed to get unit by name: ${error.message}`);
    }
  }

  /**
   * Get a unit by symbol
   * @param {string} symbol - Unit symbol
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Unit
   */
  static async getBySymbol(symbol, tenantId) {
    try {
      const query = `
        SELECT id, name, symbol, category, base_unit_id, conversion_factor, 
               created_at, updated_at, tenant_id
        FROM units
        WHERE symbol = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
        ORDER BY tenant_id NULLS LAST
        LIMIT 1
      `;
      
      const values = [symbol, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting unit by symbol ${symbol}:`, error);
      throw new Error(`Failed to get unit by symbol: ${error.message}`);
    }
  }

  /**
   * Get all units
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Units
   */
  static async getAll(tenantId) {
    try {
      const query = `
        SELECT id, name, symbol, category, base_unit_id, conversion_factor, 
               created_at, updated_at, tenant_id
        FROM units
        WHERE tenant_id = $1 OR tenant_id IS NULL
        ORDER BY category, name
      `;
      
      const values = [tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting all units:', error);
      throw new Error(`Failed to get units: ${error.message}`);
    }
  }

  /**
   * Get units by category
   * @param {string} category - Unit category
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Units
   */
  static async getByCategory(category, tenantId) {
    try {
      const query = `
        SELECT id, name, symbol, category, base_unit_id, conversion_factor, 
               created_at, updated_at, tenant_id
        FROM units
        WHERE category = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
        ORDER BY name
      `;
      
      const values = [category, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting units by category ${category}:`, error);
      throw new Error(`Failed to get units by category: ${error.message}`);
    }
  }

  /**
   * Create a new unit
   * @param {Object} data - Unit data
   * @param {string} data.name - Unit name
   * @param {string} data.symbol - Unit symbol
   * @param {string} data.category - Unit category
   * @param {string} data.baseUnitId - Base unit ID for conversion
   * @param {number} data.conversionFactor - Conversion factor to base unit
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created unit
   */
  static async create(data) {
    const { 
      name, 
      symbol, 
      category, 
      baseUnitId, 
      conversionFactor, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO units (
          id, name, symbol, category, base_unit_id, conversion_factor, 
          created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, name, symbol, category, base_unit_id, conversion_factor, 
                  created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, name, symbol, category, baseUnitId, conversionFactor, 
        createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating unit:', error);
      throw new Error(`Failed to create unit: ${error.message}`);
    }
  }

  /**
   * Update a unit
   * @param {string} id - Unit ID
   * @param {Object} data - Unit data
   * @param {string} data.name - Unit name
   * @param {string} data.symbol - Unit symbol
   * @param {string} data.category - Unit category
   * @param {string} data.baseUnitId - Base unit ID for conversion
   * @param {number} data.conversionFactor - Conversion factor to base unit
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated unit
   */
  static async update(id, data, tenantId) {
    const { 
      name, 
      symbol, 
      category, 
      baseUnitId, 
      conversionFactor 
    } = data;
    
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE units
        SET name = $1, symbol = $2, category = $3, 
            base_unit_id = $4, conversion_factor = $5, updated_at = $6
        WHERE id = $7 AND tenant_id = $8
        RETURNING id, name, symbol, category, base_unit_id, conversion_factor, 
                  created_at, updated_at, tenant_id
      `;
      
      const values = [
        name, symbol, category, 
        baseUnitId, conversionFactor, updatedAt, 
        id, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating unit ${id}:`, error);
      throw new Error(`Failed to update unit: ${error.message}`);
    }
  }

  /**
   * Delete a unit
   * @param {string} id - Unit ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM units
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting unit ${id}:`, error);
      throw new Error(`Failed to delete unit: ${error.message}`);
    }
  }

  /**
   * Convert a quantity from one unit to another
   * @param {number} quantity - Quantity to convert
   * @param {string} fromUnitId - Source unit ID
   * @param {string} toUnitId - Target unit ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Converted quantity
   */
  static async convert(quantity, fromUnitId, toUnitId, tenantId) {
    try {
      // If units are the same, no conversion needed
      if (fromUnitId === toUnitId) {
        return quantity;
      }
      
      // Get source and target units
      const fromUnit = await Unit.getById(fromUnitId, tenantId);
      const toUnit = await Unit.getById(toUnitId, tenantId);
      
      if (!fromUnit || !toUnit) {
        throw new Error('Invalid units for conversion');
      }
      
      // Check if units are in the same category
      if (fromUnit.category !== toUnit.category) {
        throw new Error(`Cannot convert between different unit categories: ${fromUnit.category} and ${toUnit.category}`);
      }
      
      // If either unit doesn't have a base unit, we can't convert
      if (!fromUnit.base_unit_id && fromUnit.id !== fromUnit.base_unit_id) {
        throw new Error(`Source unit ${fromUnit.name} has no base unit for conversion`);
      }
      
      if (!toUnit.base_unit_id && toUnit.id !== toUnit.base_unit_id) {
        throw new Error(`Target unit ${toUnit.name} has no base unit for conversion`);
      }
      
      // Convert to base unit first (if not already a base unit)
      let baseQuantity = quantity;
      if (fromUnit.base_unit_id && fromUnit.id !== fromUnit.base_unit_id) {
        baseQuantity = quantity * fromUnit.conversion_factor;
      }
      
      // Convert from base unit to target unit (if not a base unit)
      let convertedQuantity = baseQuantity;
      if (toUnit.base_unit_id && toUnit.id !== toUnit.base_unit_id) {
        convertedQuantity = baseQuantity / toUnit.conversion_factor;
      }
      
      return convertedQuantity;
    } catch (error) {
      logger.error(`Error converting units from ${fromUnitId} to ${toUnitId}:`, error);
      throw new Error(`Failed to convert units: ${error.message}`);
    }
  }

  /**
   * Get the best unit for a quantity in a category
   * @param {number} quantity - Quantity to evaluate
   * @param {string} unitId - Current unit ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Best unit and converted quantity
   */
  static async getBestUnit(quantity, unitId, tenantId) {
    try {
      // Get current unit
      const currentUnit = await Unit.getById(unitId, tenantId);
      
      if (!currentUnit) {
        throw new Error('Invalid unit');
      }
      
      // Get all units in the same category
      const categoryUnits = await Unit.getByCategory(currentUnit.category, tenantId);
      
      // Convert quantity to base unit
      let baseQuantity = quantity;
      if (currentUnit.base_unit_id && currentUnit.id !== currentUnit.base_unit_id) {
        baseQuantity = quantity * currentUnit.conversion_factor;
      }
      
      // Find the best unit based on the quantity
      let bestUnit = currentUnit;
      let bestQuantity = quantity;
      
      for (const unit of categoryUnits) {
        // Skip units without conversion factors
        if (!unit.conversion_factor && unit.id !== unit.base_unit_id) {
          continue;
        }
        
        // Calculate quantity in this unit
        let unitQuantity = baseQuantity;
        if (unit.base_unit_id && unit.id !== unit.base_unit_id) {
          unitQuantity = baseQuantity / unit.conversion_factor;
        }
        
        // Check if this unit is better
        // Prefer units where the quantity is between 0.1 and 100
        if (
          (unitQuantity >= 0.1 && unitQuantity < 100 && 
           (bestQuantity < 0.1 || bestQuantity >= 100)) ||
          (unitQuantity >= 0.1 && unitQuantity < 100 && 
           bestQuantity >= 0.1 && bestQuantity < 100 && 
           Math.abs(1 - unitQuantity) < Math.abs(1 - bestQuantity))
        ) {
          bestUnit = unit;
          bestQuantity = unitQuantity;
        }
      }
      
      return {
        unit: bestUnit,
        quantity: bestQuantity
      };
    } catch (error) {
      logger.error(`Error finding best unit for ${quantity} ${unitId}:`, error);
      throw new Error(`Failed to find best unit: ${error.message}`);
    }
  }
}

module.exports = Unit;
