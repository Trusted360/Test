const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * CategoryRule model
 * Represents a rule for automatic categorization of recipes
 */
class CategoryRule {
  /**
   * Create a new category rule
   * @param {Object} data - Category rule data
   * @param {string} data.categoryId - Category ID
   * @param {string} data.ruleType - Rule type ('tag', 'ingredient', 'name_contains', 'custom')
   * @param {Object} data.ruleValue - Rule value (depends on rule type)
   * @param {number} data.priority - Priority (higher values are processed first)
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created category rule
   */
  static async create(data) {
    const { 
      categoryId, 
      ruleType, 
      ruleValue, 
      priority = 0, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO category_rules (
          id, category_id, rule_type, rule_value, priority,
          created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, category_id, rule_type, rule_value, priority,
                  created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, categoryId, ruleType, ruleValue, priority,
        createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating category rule:', error);
      throw new Error(`Failed to create category rule: ${error.message}`);
    }
  }

  /**
   * Get a category rule by ID
   * @param {string} id - Category rule ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Category rule
   */
  static async getById(id, tenantId) {
    try {
      const query = `
        SELECT cr.id, cr.category_id, cr.rule_type, cr.rule_value, cr.priority,
               cr.created_at, cr.updated_at, cr.tenant_id,
               c.name as category_name
        FROM category_rules cr
        JOIN categories c ON cr.category_id = c.id
        WHERE cr.id = $1 AND cr.tenant_id = $2
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting category rule ${id}:`, error);
      throw new Error(`Failed to get category rule: ${error.message}`);
    }
  }

  /**
   * Get all category rules
   * @param {Object} options - Query options
   * @param {string} options.categoryId - Filter by category ID
   * @param {string} options.ruleType - Filter by rule type
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Category rules
   */
  static async getAll(options = {}, tenantId) {
    const { 
      categoryId, 
      ruleType, 
      limit = 100, 
      offset = 0 
    } = options;
    
    try {
      let query = `
        SELECT cr.id, cr.category_id, cr.rule_type, cr.rule_value, cr.priority,
               cr.created_at, cr.updated_at, cr.tenant_id,
               c.name as category_name
        FROM category_rules cr
        JOIN categories c ON cr.category_id = c.id
        WHERE cr.tenant_id = $1
      `;
      
      const queryParams = [tenantId];
      let paramIndex = 2;
      
      if (categoryId) {
        query += ` AND cr.category_id = $${paramIndex}`;
        queryParams.push(categoryId);
        paramIndex++;
      }
      
      if (ruleType) {
        query += ` AND cr.rule_type = $${paramIndex}`;
        queryParams.push(ruleType);
        paramIndex++;
      }
      
      query += ` ORDER BY cr.priority DESC, cr.created_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);
      
      const result = await pool.query(query, queryParams);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting category rules:', error);
      throw new Error(`Failed to get category rules: ${error.message}`);
    }
  }

  /**
   * Get rules for a category
   * @param {string} categoryId - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Category rules
   */
  static async getByCategoryId(categoryId, tenantId) {
    try {
      const query = `
        SELECT cr.id, cr.category_id, cr.rule_type, cr.rule_value, cr.priority,
               cr.created_at, cr.updated_at, cr.tenant_id,
               c.name as category_name
        FROM category_rules cr
        JOIN categories c ON cr.category_id = c.id
        WHERE cr.category_id = $1 AND cr.tenant_id = $2
        ORDER BY cr.priority DESC, cr.created_at ASC
      `;
      
      const values = [categoryId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting rules for category ${categoryId}:`, error);
      throw new Error(`Failed to get rules for category: ${error.message}`);
    }
  }

  /**
   * Update a category rule
   * @param {string} id - Category rule ID
   * @param {Object} data - Category rule data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated category rule
   */
  static async update(id, data, tenantId) {
    const { 
      categoryId, 
      ruleType, 
      ruleValue, 
      priority 
    } = data;
    
    const updatedAt = new Date();

    try {
      // Build dynamic update query based on provided fields
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      if (categoryId !== undefined) {
        updates.push(`category_id = $${paramIndex++}`);
        values.push(categoryId);
      }
      
      if (ruleType !== undefined) {
        updates.push(`rule_type = $${paramIndex++}`);
        values.push(ruleType);
      }
      
      if (ruleValue !== undefined) {
        updates.push(`rule_value = $${paramIndex++}`);
        values.push(ruleValue);
      }
      
      if (priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        values.push(priority);
      }
      
      updates.push(`updated_at = $${paramIndex++}`);
      values.push(updatedAt);
      
      // Add id and tenantId to values
      values.push(id, tenantId);
      
      const query = `
        UPDATE category_rules
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        RETURNING id, category_id, rule_type, rule_value, priority,
                  created_at, updated_at, tenant_id
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating category rule ${id}:`, error);
      throw new Error(`Failed to update category rule: ${error.message}`);
    }
  }

  /**
   * Delete a category rule
   * @param {string} id - Category rule ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      const query = `
        DELETE FROM category_rules
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting category rule ${id}:`, error);
      throw new Error(`Failed to delete category rule: ${error.message}`);
    }
  }

  /**
   * Delete all rules for a category
   * @param {string} categoryId - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteByCategoryId(categoryId, tenantId) {
    try {
      const query = `
        DELETE FROM category_rules
        WHERE category_id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const values = [categoryId, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting rules for category ${categoryId}:`, error);
      throw new Error(`Failed to delete rules for category: ${error.message}`);
    }
  }

  /**
   * Create a tag-based rule
   * @param {string} categoryId - Category ID
   * @param {string} tagName - Tag name
   * @param {number} priority - Priority
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created category rule
   */
  static async createTagRule(categoryId, tagName, priority, tenantId) {
    const ruleValue = { tag_name: tagName };
    
    return this.create({
      categoryId,
      ruleType: 'tag',
      ruleValue,
      priority,
      tenantId
    });
  }

  /**
   * Create an ingredient-based rule
   * @param {string} categoryId - Category ID
   * @param {string} ingredientName - Ingredient name
   * @param {number} priority - Priority
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created category rule
   */
  static async createIngredientRule(categoryId, ingredientName, priority, tenantId) {
    const ruleValue = { ingredient_name: ingredientName };
    
    return this.create({
      categoryId,
      ruleType: 'ingredient',
      ruleValue,
      priority,
      tenantId
    });
  }

  /**
   * Create a name-contains rule
   * @param {string} categoryId - Category ID
   * @param {string} text - Text to search for in recipe name
   * @param {number} priority - Priority
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created category rule
   */
  static async createNameContainsRule(categoryId, text, priority, tenantId) {
    const ruleValue = { text };
    
    return this.create({
      categoryId,
      ruleType: 'name_contains',
      ruleValue,
      priority,
      tenantId
    });
  }

  /**
   * Test a rule against a recipe
   * @param {Object} rule - Category rule
   * @param {Object} recipe - Recipe to test
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Whether the rule matches
   */
  static async testRule(rule, recipe, tenantId) {
    try {
      let match = false;
      
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
          recipe.id, 
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
          recipe.id, 
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
      
      return match;
    } catch (error) {
      logger.error(`Error testing rule ${rule.id} against recipe ${recipe.id}:`, error);
      throw new Error(`Failed to test rule: ${error.message}`);
    }
  }

  /**
   * Apply rules to a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Matched categories
   */
  static async applyRules(recipeId, tenantId) {
    try {
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
      
      // Get all rules
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
        const match = await this.testRule(rule, recipe, tenantId);
        
        if (match) {
          matchedCategories.push({
            id: rule.category_id,
            name: rule.category_name,
            rule_id: rule.id,
            rule_type: rule.rule_type
          });
        }
      }
      
      return matchedCategories;
    } catch (error) {
      logger.error(`Error applying rules to recipe ${recipeId}:`, error);
      throw new Error(`Failed to apply rules: ${error.message}`);
    }
  }
}

module.exports = CategoryRule;
