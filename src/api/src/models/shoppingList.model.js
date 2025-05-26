const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * ShoppingList model
 */
class ShoppingList {
  /**
   * Create a new shopping list
   * @param {Object} data - Shopping list data
   * @param {string} data.householdId - Household ID
   * @param {string} data.mealPlanId - Meal plan ID (optional)
   * @param {string} data.name - Shopping list name
   * @param {string} data.status - Status (active, completed)
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created shopping list
   */
  static async create(data) {
    const { 
      householdId, 
      mealPlanId, 
      name, 
      status = 'active', 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const generatedOn = new Date();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO shopping_lists (
          id, household_id, meal_plan_id, name, generated_on, status, 
          created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, household_id, meal_plan_id, name, generated_on, status, 
                  created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, householdId, mealPlanId, name, generatedOn, status, 
        createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating shopping list:', error);
      throw new Error(`Failed to create shopping list: ${error.message}`);
    }
  }

  /**
   * Get a shopping list by ID
   * @param {string} id - Shopping list ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Shopping list
   */
  static async getById(id, tenantId) {
    try {
      // Get shopping list
      const shoppingListQuery = `
        SELECT id, household_id, meal_plan_id, name, generated_on, status, 
               created_at, updated_at, tenant_id
        FROM shopping_lists
        WHERE id = $1 AND tenant_id = $2
      `;
      const shoppingListValues = [id, tenantId];
      const shoppingListResult = await pool.query(shoppingListQuery, shoppingListValues);
      
      if (shoppingListResult.rows.length === 0) {
        return null;
      }
      
      const shoppingList = shoppingListResult.rows[0];
      
      // Get shopping list items
      const itemsQuery = `
        SELECT sli.id, sli.ingredient_id, sli.name, sli.quantity, sli.unit_id, 
               sli.store_section, sli.purchased, sli.notes, sli.created_at, sli.updated_at,
               i.name as ingredient_name, i.category as ingredient_category,
               u.name as unit_name, u.symbol as unit_symbol
        FROM shopping_list_items sli
        LEFT JOIN ingredients i ON sli.ingredient_id = i.id
        LEFT JOIN units u ON sli.unit_id = u.id
        WHERE sli.shopping_list_id = $1 AND sli.tenant_id = $2
        ORDER BY 
          CASE 
            WHEN sli.purchased THEN 1
            ELSE 0
          END,
          sli.store_section,
          sli.name
      `;
      const itemsValues = [id, tenantId];
      const itemsResult = await pool.query(itemsQuery, itemsValues);
      
      shoppingList.items = itemsResult.rows.map(row => ({
        id: row.id,
        ingredientId: row.ingredient_id,
        name: row.name,
        quantity: row.quantity,
        unit: row.unit_id ? {
          id: row.unit_id,
          name: row.unit_name,
          symbol: row.unit_symbol
        } : null,
        storeSection: row.store_section,
        purchased: row.purchased,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ingredient: row.ingredient_id ? {
          id: row.ingredient_id,
          name: row.ingredient_name,
          category: row.ingredient_category
        } : null
      }));
      
      return shoppingList;
    } catch (error) {
      logger.error(`Error getting shopping list ${id}:`, error);
      throw new Error(`Failed to get shopping list: ${error.message}`);
    }
  }

  /**
   * Get all shopping lists for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Shopping lists
   */
  static async getByHouseholdId(householdId, tenantId) {
    try {
      const query = `
        SELECT id, household_id, meal_plan_id, name, generated_on, status, 
               created_at, updated_at, tenant_id
        FROM shopping_lists
        WHERE household_id = $1 AND tenant_id = $2
        ORDER BY generated_on DESC
      `;
      
      const values = [householdId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting shopping lists for household ${householdId}:`, error);
      throw new Error(`Failed to get household shopping lists: ${error.message}`);
    }
  }

  /**
   * Get current shopping list for a household
   * @param {string} householdId - Household ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Current shopping list
   */
  static async getCurrentForHousehold(householdId, tenantId) {
    try {
      const query = `
        SELECT id, household_id, meal_plan_id, name, generated_on, status, 
               created_at, updated_at, tenant_id
        FROM shopping_lists
        WHERE household_id = $1 
          AND tenant_id = $2
          AND status = 'active'
        ORDER BY generated_on DESC
        LIMIT 1
      `;
      
      const values = [householdId, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Get full shopping list with items
      return await ShoppingList.getById(result.rows[0].id, tenantId);
    } catch (error) {
      logger.error(`Error getting current shopping list for household ${householdId}:`, error);
      throw new Error(`Failed to get current shopping list: ${error.message}`);
    }
  }

  /**
   * Update a shopping list
   * @param {string} id - Shopping list ID
   * @param {Object} data - Shopping list data
   * @param {string} data.name - Shopping list name
   * @param {string} data.status - Status
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated shopping list
   */
  static async update(id, data, tenantId) {
    const { name, status } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE shopping_lists
        SET name = $1, status = $2, updated_at = $3
        WHERE id = $4 AND tenant_id = $5
        RETURNING id, household_id, meal_plan_id, name, generated_on, status, 
                  created_at, updated_at, tenant_id
      `;
      
      const values = [name, status, updatedAt, id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating shopping list ${id}:`, error);
      throw new Error(`Failed to update shopping list: ${error.message}`);
    }
  }

  /**
   * Delete a shopping list
   * @param {string} id - Shopping list ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Delete shopping list items
      const deleteItemsQuery = `
        DELETE FROM shopping_list_items
        WHERE shopping_list_id = $1 AND tenant_id = $2
      `;
      const deleteItemsValues = [id, tenantId];
      await pool.query(deleteItemsQuery, deleteItemsValues);
      
      // Delete shopping list
      const deleteShoppingListQuery = `
        DELETE FROM shopping_lists
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const deleteShoppingListValues = [id, tenantId];
      const result = await pool.query(deleteShoppingListQuery, deleteShoppingListValues);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return result.rows.length > 0;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error deleting shopping list ${id}:`, error);
      throw new Error(`Failed to delete shopping list: ${error.message}`);
    }
  }

  /**
   * Add an item to a shopping list
   * @param {Object} data - Shopping list item data
   * @param {string} data.shoppingListId - Shopping list ID
   * @param {string} data.ingredientId - Ingredient ID (optional)
   * @param {string} data.name - Item name
   * @param {number} data.quantity - Quantity
   * @param {string} data.unitId - Unit ID (optional)
   * @param {string} data.storeSection - Store section
   * @param {boolean} data.purchased - Whether the item has been purchased
   * @param {string} data.notes - Notes
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created shopping list item
   */
  static async addItem(data) {
    const { 
      shoppingListId, 
      ingredientId, 
      name, 
      quantity, 
      unitId, 
      storeSection, 
      purchased = false, 
      notes, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO shopping_list_items (
          id, shopping_list_id, ingredient_id, name, quantity, unit_id, 
          store_section, purchased, notes, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, shopping_list_id, ingredient_id, name, quantity, unit_id, 
                  store_section, purchased, notes, created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, shoppingListId, ingredientId, name, quantity, unitId, 
        storeSection, purchased, notes, createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding item to shopping list:', error);
      throw new Error(`Failed to add item to shopping list: ${error.message}`);
    }
  }

  /**
   * Update a shopping list item
   * @param {string} id - Shopping list item ID
   * @param {Object} data - Shopping list item data
   * @param {string} data.name - Item name
   * @param {number} data.quantity - Quantity
   * @param {string} data.unitId - Unit ID
   * @param {string} data.storeSection - Store section
   * @param {boolean} data.purchased - Whether the item has been purchased
   * @param {string} data.notes - Notes
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated shopping list item
   */
  static async updateItem(id, data, tenantId) {
    const { name, quantity, unitId, storeSection, purchased, notes } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE shopping_list_items
        SET name = $1, quantity = $2, unit_id = $3, store_section = $4, 
            purchased = $5, notes = $6, updated_at = $7
        WHERE id = $8 AND tenant_id = $9
        RETURNING id, shopping_list_id, ingredient_id, name, quantity, unit_id, 
                  store_section, purchased, notes, created_at, updated_at, tenant_id
      `;
      
      const values = [
        name, quantity, unitId, storeSection, 
        purchased, notes, updatedAt, id, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating shopping list item ${id}:`, error);
      throw new Error(`Failed to update shopping list item: ${error.message}`);
    }
  }

  /**
   * Mark a shopping list item as purchased or not purchased
   * @param {string} id - Shopping list item ID
   * @param {boolean} purchased - Whether the item has been purchased
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated shopping list item
   */
  static async markItemPurchased(id, purchased, tenantId) {
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE shopping_list_items
        SET purchased = $1, updated_at = $2
        WHERE id = $3 AND tenant_id = $4
        RETURNING id, shopping_list_id, ingredient_id, name, quantity, unit_id, 
                  store_section, purchased, notes, created_at, updated_at, tenant_id
      `;
      
      const values = [purchased, updatedAt, id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error marking shopping list item ${id} as ${purchased ? 'purchased' : 'not purchased'}:`, error);
      throw new Error(`Failed to mark shopping list item as ${purchased ? 'purchased' : 'not purchased'}: ${error.message}`);
    }
  }

  /**
   * Remove an item from a shopping list
   * @param {string} id - Shopping list item ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeItem(id, tenantId) {
    try {
      const query = `
        DELETE FROM shopping_list_items
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing item from shopping list ${id}:`, error);
      throw new Error(`Failed to remove item from shopping list: ${error.message}`);
    }
  }

  /**
   * Generate a shopping list from a meal plan
   * @param {Object} data - Generation data
   * @param {string} data.mealPlanId - Meal plan ID
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Generated shopping list
   */
  static async generateFromMealPlan(data) {
    const { mealPlanId, tenantId } = data;
    
    try {
      // Import required models
      const Unit = require('./unit.model');
      const StoreSection = require('./storeSection.model');
      
      // Start a transaction
      await pool.query('BEGIN');
      
      // Get meal plan
      const mealPlanQuery = `
        SELECT id, household_id, name, start_date, end_date
        FROM meal_plans
        WHERE id = $1 AND tenant_id = $2
      `;
      const mealPlanValues = [mealPlanId, tenantId];
      const mealPlanResult = await pool.query(mealPlanQuery, mealPlanValues);
      
      if (mealPlanResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        throw new Error('Meal plan not found');
      }
      
      const mealPlan = mealPlanResult.rows[0];
      
      // Create shopping list
      const shoppingList = await ShoppingList.create({
        householdId: mealPlan.household_id,
        mealPlanId: mealPlan.id,
        name: `Shopping List for ${mealPlan.name}`,
        status: 'active',
        tenantId
      });
      
      // Get all ingredients from meal plan recipes
      const ingredientsQuery = `
        SELECT ri.ingredient_id, ri.quantity, ri.unit_id, ri.preparation, ri.optional,
               i.name as ingredient_name, i.category as ingredient_category,
               u.name as unit_name, u.symbol as unit_symbol, u.category as unit_category,
               mpi.servings, r.servings as recipe_servings, r.title as recipe_title
        FROM meal_plan_items mpi
        JOIN recipes r ON mpi.recipe_id = r.id
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        LEFT JOIN units u ON ri.unit_id = u.id
        WHERE mpi.meal_plan_id = $1 AND mpi.tenant_id = $2
      `;
      const ingredientsValues = [mealPlanId, tenantId];
      const ingredientsResult = await pool.query(ingredientsQuery, ingredientsValues);
      
      // First pass: Group ingredients by category and convert to base units
      const ingredientsByCategory = {};
      
      for (const row of ingredientsResult.rows) {
        // Skip optional ingredients for now
        if (row.optional) {
          continue;
        }
        
        // Calculate adjusted quantity based on servings
        const servingRatio = row.servings / (row.recipe_servings || 1);
        const adjustedQuantity = row.quantity * servingRatio;
        
        // Get or create category
        const category = row.unit_category || 'other';
        if (!ingredientsByCategory[category]) {
          ingredientsByCategory[category] = new Map();
        }
        
        // Create a key for the ingredient
        const ingredientKey = row.ingredient_id;
        
        // If ingredient already exists in this category
        if (ingredientsByCategory[category].has(ingredientKey)) {
          const existingIngredient = ingredientsByCategory[category].get(ingredientKey);
          
          // If units are the same, simply add quantities
          if (existingIngredient.unitId === row.unit_id) {
            existingIngredient.quantity += adjustedQuantity;
            existingIngredient.recipes.push(row.recipe_title);
          } else {
            // Units are different, need to convert
            try {
              // Convert both to base units and add
              let baseQuantity = adjustedQuantity;
              
              // Convert current quantity to base unit if needed
              if (row.unit_id) {
                const unit = await Unit.getById(row.unit_id, tenantId);
                if (unit && unit.base_unit_id && unit.conversion_factor) {
                  baseQuantity = adjustedQuantity * unit.conversion_factor;
                }
              }
              
              // Add to existing base quantity
              existingIngredient.baseQuantity += baseQuantity;
              existingIngredient.recipes.push(row.recipe_title);
            } catch (conversionError) {
              logger.warn(`Could not convert units for ${row.ingredient_name}: ${conversionError.message}`);
              
              // If conversion fails, add as a separate item with original units
              const newKey = `${ingredientKey}:${row.unit_id || 'none'}`;
              ingredientsByCategory[category].set(newKey, {
                ingredientId: row.ingredient_id,
                name: row.ingredient_name,
                quantity: adjustedQuantity,
                unitId: row.unit_id,
                unitName: row.unit_name,
                unitSymbol: row.unit_symbol,
                unitCategory: row.unit_category,
                baseQuantity: adjustedQuantity, // Assume this is already base quantity
                storeSection: row.ingredient_category,
                preparation: row.preparation,
                recipes: [row.recipe_title]
              });
            }
          }
        } else {
          // New ingredient
          let baseQuantity = adjustedQuantity;
          
          // Convert to base unit if needed
          if (row.unit_id) {
            const unit = await Unit.getById(row.unit_id, tenantId);
            if (unit && unit.base_unit_id && unit.conversion_factor) {
              baseQuantity = adjustedQuantity * unit.conversion_factor;
            }
          }
          
          ingredientsByCategory[category].set(ingredientKey, {
            ingredientId: row.ingredient_id,
            name: row.ingredient_name,
            quantity: adjustedQuantity,
            unitId: row.unit_id,
            unitName: row.unit_name,
            unitSymbol: row.unit_symbol,
            unitCategory: row.unit_category,
            baseQuantity: baseQuantity,
            storeSection: row.ingredient_category,
            preparation: row.preparation,
            recipes: [row.recipe_title]
          });
        }
      }
      
      // Second pass: Find the best unit for each ingredient and convert back
      const finalIngredients = [];
      
      for (const category in ingredientsByCategory) {
        for (const [key, ingredient] of ingredientsByCategory[category].entries()) {
          try {
            // Find the best unit for this quantity
            let bestUnit = null;
            let bestQuantity = ingredient.baseQuantity;
            
            if (ingredient.unitCategory) {
              // Get all units in this category
              const units = await Unit.getByCategory(ingredient.unitCategory, tenantId);
              
              // Find the best unit (one that gives a nice number between 0.1 and 100)
              for (const unit of units) {
                if (!unit.conversion_factor) continue;
                
                const convertedQuantity = ingredient.baseQuantity / unit.conversion_factor;
                
                // Check if this unit is better
                if (
                  (convertedQuantity >= 0.1 && convertedQuantity < 100 && 
                   (bestQuantity < 0.1 || bestQuantity >= 100)) ||
                  (convertedQuantity >= 0.1 && convertedQuantity < 100 && 
                   bestQuantity >= 0.1 && bestQuantity < 100 && 
                   Math.abs(1 - convertedQuantity) < Math.abs(1 - bestQuantity))
                ) {
                  bestUnit = unit;
                  bestQuantity = convertedQuantity;
                }
              }
            }
            
            // If no better unit found, use the original
            if (!bestUnit && ingredient.unitId) {
              bestUnit = await Unit.getById(ingredient.unitId, tenantId);
              bestQuantity = ingredient.quantity;
            }
            
            // Get the best store section for this ingredient
            let storeSection = null;
            if (ingredient.ingredientId) {
              storeSection = await StoreSection.getBestSectionForIngredient(ingredient.ingredientId, tenantId);
            }
            
            // If no store section found, use a default
            if (!storeSection) {
              storeSection = await StoreSection.getByName('Other', tenantId);
            }
            
            // Round the quantity appropriately
            // For small quantities (< 1), round to nearest 0.1
            // For medium quantities (1-10), round to nearest 0.5
            // For large quantities (> 10), round to nearest 1
            let roundedQuantity;
            if (bestQuantity < 1) {
              roundedQuantity = Math.ceil(bestQuantity * 10) / 10;
            } else if (bestQuantity <= 10) {
              roundedQuantity = Math.ceil(bestQuantity * 2) / 2;
            } else {
              roundedQuantity = Math.ceil(bestQuantity);
            }
            
            // Add to final ingredients list
            finalIngredients.push({
              ingredientId: ingredient.ingredientId,
              name: ingredient.name,
              quantity: roundedQuantity,
              unitId: bestUnit ? bestUnit.id : null,
              unitName: bestUnit ? bestUnit.name : null,
              unitSymbol: bestUnit ? bestUnit.symbol : null,
              storeSectionId: storeSection ? storeSection.id : null,
              storeSection: storeSection ? storeSection.name : 'Other',
              storeSectionOrder: storeSection ? storeSection.display_order : 999,
              preparation: ingredient.preparation,
              notes: ingredient.recipes.length > 1 
                ? `Used in: ${[...new Set(ingredient.recipes)].join(', ')}` 
                : ''
            });
          } catch (error) {
            logger.warn(`Error processing ingredient ${ingredient.name}: ${error.message}`);
            
            // If there's an error, add the ingredient with original units
            finalIngredients.push({
              ingredientId: ingredient.ingredientId,
              name: ingredient.name,
              quantity: Math.ceil(ingredient.quantity * 10) / 10, // Round up to nearest 0.1
              unitId: ingredient.unitId,
              unitName: ingredient.unitName,
              unitSymbol: ingredient.unitSymbol,
              storeSection: ingredient.storeSection || 'Other',
              storeSectionOrder: 999,
              preparation: ingredient.preparation,
              notes: ingredient.recipes.length > 1 
                ? `Used in: ${[...new Set(ingredient.recipes)].join(', ')}` 
                : ''
            });
          }
        }
      }
      
      // Sort ingredients by store section and name
      finalIngredients.sort((a, b) => {
        if (a.storeSectionOrder !== b.storeSectionOrder) {
          return a.storeSectionOrder - b.storeSectionOrder;
        }
        return a.name.localeCompare(b.name);
      });
      
      // Add items to shopping list
      for (const item of finalIngredients) {
        await ShoppingList.addItem({
          shoppingListId: shoppingList.id,
          ingredientId: item.ingredientId,
          name: item.name,
          quantity: item.quantity,
          unitId: item.unitId,
          storeSection: item.storeSection,
          storeSectionOrder: item.storeSectionOrder,
          purchased: false,
          notes: item.notes,
          tenantId
        });
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      // Return the complete shopping list
      return await ShoppingList.getById(shoppingList.id, tenantId);
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error('Error generating shopping list from meal plan:', error);
      throw new Error(`Failed to generate shopping list: ${error.message}`);
    }
  }
}

module.exports = ShoppingList;
