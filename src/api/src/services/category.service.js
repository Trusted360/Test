const { 
  CategoryGroup, 
  Category, 
  RecipeCategory, 
  CategoryRule, 
  Recipe 
} = require('../models');
const logger = require('../utils/logger');
const { redisClient } = require('./redis');
const ollamaService = require('./ollama.service');
const { pool } = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * Category service
 * Handles operations related to recipe categorization
 */
class CategoryService {
  /**
   * Create a new category group
   * @param {Object} data - Category group data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created category group
   */
  static async createCategoryGroup(data, tenantId) {
    try {
      // Check if category group with same name already exists
      const existingGroup = await CategoryGroup.getByName(data.name, tenantId);
      if (existingGroup) {
        throw new Error(`Category group with name '${data.name}' already exists`);
      }
      
      const groupData = {
        ...data,
        tenantId
      };
      
      const group = await CategoryGroup.create(groupData);
      
      // Invalidate cache
      await this._invalidateCategoryCache(tenantId);
      
      logger.info(`Created category group ${group.id} with name '${group.name}'`);
      return group;
    } catch (error) {
      logger.error('Error creating category group:', error);
      throw error;
    }
  }

  /**
   * Get a category group by ID
   * @param {string} id - Category group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Category group
   */
  static async getCategoryGroup(id, tenantId) {
    try {
      const group = await CategoryGroup.getById(id, tenantId);
      
      if (!group) {
        throw new Error(`Category group not found: ${id}`);
      }
      
      return group;
    } catch (error) {
      logger.error(`Error getting category group ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all category groups
   * @param {Object} options - Query options
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Category groups
   */
  static async getCategoryGroups(options, tenantId) {
    try {
      // Check cache for common queries
      if (!options.search && options.limit === 100 && options.offset === 0) {
        const cacheKey = `category-groups:${tenantId}:all`;
        
        const cachedGroups = await redisClient.get(cacheKey);
        if (cachedGroups) {
          logger.debug(`Retrieved category groups from cache: ${cacheKey}`);
          return JSON.parse(cachedGroups);
        }
      }
      
      const groups = await CategoryGroup.getAll(options, tenantId);
      
      // Cache common queries
      if (!options.search && options.limit === 100 && options.offset === 0) {
        const cacheKey = `category-groups:${tenantId}:all`;
        
        await redisClient.set(cacheKey, JSON.stringify(groups), { EX: 3600 }); // Cache for 1 hour
        logger.debug(`Cached category groups: ${cacheKey}`);
      }
      
      return groups;
    } catch (error) {
      logger.error('Error getting category groups:', error);
      throw error;
    }
  }

  /**
   * Update a category group
   * @param {string} id - Category group ID
   * @param {Object} data - Category group data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated category group
   */
  static async updateCategoryGroup(id, data, tenantId) {
    try {
      // Check if category group exists
      const existingGroup = await CategoryGroup.getById(id, tenantId);
      if (!existingGroup) {
        throw new Error(`Category group not found: ${id}`);
      }
      
      // Check if name is being changed and if new name already exists
      if (data.name && data.name !== existingGroup.name) {
        const groupWithSameName = await CategoryGroup.getByName(data.name, tenantId);
        if (groupWithSameName && groupWithSameName.id !== id) {
          throw new Error(`Category group with name '${data.name}' already exists`);
        }
      }
      
      const group = await CategoryGroup.update(id, data, tenantId);
      
      // Invalidate cache
      await this._invalidateCategoryCache(tenantId);
      
      logger.info(`Updated category group ${id}`);
      return group;
    } catch (error) {
      logger.error(`Error updating category group ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a category group
   * @param {string} id - Category group ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteCategoryGroup(id, tenantId) {
    try {
      // Check if category group exists
      const existingGroup = await CategoryGroup.getById(id, tenantId);
      if (!existingGroup) {
        throw new Error(`Category group not found: ${id}`);
      }
      
      const success = await CategoryGroup.delete(id, tenantId);
      
      // Invalidate cache
      await this._invalidateCategoryCache(tenantId);
      
      logger.info(`Deleted category group ${id}`);
      return success;
    } catch (error) {
      logger.error(`Error deleting category group ${id}:`, error);
      throw error;
    }
  }

  /**
   * Reorder category groups
   * @param {Array} groupIds - Ordered array of category group IDs
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async reorderCategoryGroups(groupIds, tenantId) {
    try {
      // Verify all groups exist
      for (const groupId of groupIds) {
        const group = await CategoryGroup.getById(groupId, tenantId);
        if (!group) {
          throw new Error(`Category group not found: ${groupId}`);
        }
      }
      
      const success = await CategoryGroup.reorder(groupIds, tenantId);
      
      // Invalidate cache
      await this._invalidateCategoryCache(tenantId);
      
      logger.info(`Reordered category groups`);
      return success;
    } catch (error) {
      logger.error('Error reordering category groups:', error);
      throw error;
    }
  }

  /**
   * Create a new category
   * @param {Object} data - Category data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created category
   */
  static async createCategory(data, tenantId) {
    try {
      // Check if category group exists
      const group = await CategoryGroup.getById(data.categoryGroupId, tenantId);
      if (!group) {
        throw new Error(`Category group not found: ${data.categoryGroupId}`);
      }
      
      // Check if category with same name already exists in the same group
      const existingCategory = await Category.getByNameAndGroup(
        data.name, 
        data.categoryGroupId, 
        tenantId
      );
      
      if (existingCategory) {
        throw new Error(`Category with name '${data.name}' already exists in this group`);
      }
      
      // Check if parent category exists if provided
      if (data.parentId) {
        const parentCategory = await Category.getById(data.parentId, tenantId);
        if (!parentCategory) {
          throw new Error(`Parent category not found: ${data.parentId}`);
        }
      }
      
      const categoryData = {
        ...data,
        tenantId
      };
      
      const category = await Category.create(categoryData);
      
      // Invalidate cache
      await this._invalidateCategoryCache(tenantId);
      
      logger.info(`Created category ${category.id} with name '${category.name}'`);
      return category;
    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Get a category by ID
   * @param {string} id - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Category
   */
  static async getCategory(id, tenantId) {
    try {
      const category = await Category.getById(id, tenantId);
      
      if (!category) {
        throw new Error(`Category not found: ${id}`);
      }
      
      return category;
    } catch (error) {
      logger.error(`Error getting category ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all categories
   * @param {Object} options - Query options
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Categories
   */
  static async getCategories(options, tenantId) {
    try {
      // Check cache for common queries
      if (!options.search && !options.categoryGroupId && !options.parentId && 
          options.limit === 100 && options.offset === 0) {
        const cacheKey = `categories:${tenantId}:all`;
        
        const cachedCategories = await redisClient.get(cacheKey);
        if (cachedCategories) {
          logger.debug(`Retrieved categories from cache: ${cacheKey}`);
          return JSON.parse(cachedCategories);
        }
      }
      
      const categories = await Category.getAll(options, tenantId);
      
      // Cache common queries
      if (!options.search && !options.categoryGroupId && !options.parentId && 
          options.limit === 100 && options.offset === 0) {
        const cacheKey = `categories:${tenantId}:all`;
        
        await redisClient.set(cacheKey, JSON.stringify(categories), { EX: 3600 }); // Cache for 1 hour
        logger.debug(`Cached categories: ${cacheKey}`);
      }
      
      return categories;
    } catch (error) {
      logger.error('Error getting categories:', error);
      throw error;
    }
  }

  /**
   * Update a category
   * @param {string} id - Category ID
   * @param {Object} data - Category data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated category
   */
  static async updateCategory(id, data, tenantId) {
    try {
      // Check if category exists
      const existingCategory = await Category.getById(id, tenantId);
      if (!existingCategory) {
        throw new Error(`Category not found: ${id}`);
      }
      
      // Check if category group is being changed and if it exists
      if (data.categoryGroupId && data.categoryGroupId !== existingCategory.category_group_id) {
        const group = await CategoryGroup.getById(data.categoryGroupId, tenantId);
        if (!group) {
          throw new Error(`Category group not found: ${data.categoryGroupId}`);
        }
      }
      
      // Check if name is being changed and if new name already exists in the same group
      if (data.name && data.name !== existingCategory.name) {
        const groupId = data.categoryGroupId || existingCategory.category_group_id;
        const categoryWithSameName = await Category.getByNameAndGroup(
          data.name, 
          groupId, 
          tenantId
        );
        
        if (categoryWithSameName && categoryWithSameName.id !== id) {
          throw new Error(`Category with name '${data.name}' already exists in this group`);
        }
      }
      
      // Check if parent category is being changed and if it exists
      if (data.parentId && data.parentId !== existingCategory.parent_id) {
        const parentCategory = await Category.getById(data.parentId, tenantId);
        if (!parentCategory) {
          throw new Error(`Parent category not found: ${data.parentId}`);
        }
        
        // Prevent circular references
        if (data.parentId === id) {
          throw new Error('Category cannot be its own parent');
        }
      }
      
      const category = await Category.update(id, data, tenantId);
      
      // Invalidate cache
      await this._invalidateCategoryCache(tenantId);
      
      logger.info(`Updated category ${id}`);
      return category;
    } catch (error) {
      logger.error(`Error updating category ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a category
   * @param {string} id - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteCategory(id, tenantId) {
    try {
      // Check if category exists
      const existingCategory = await Category.getById(id, tenantId);
      if (!existingCategory) {
        throw new Error(`Category not found: ${id}`);
      }
      
      const success = await Category.delete(id, tenantId);
      
      // Invalidate cache
      await this._invalidateCategoryCache(tenantId);
      
      logger.info(`Deleted category ${id}`);
      return success;
    } catch (error) {
      logger.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  }

  /**
   * Reorder categories within a group
   * @param {string} categoryGroupId - Category group ID
   * @param {Array} categoryIds - Ordered array of category IDs
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async reorderCategories(categoryGroupId, categoryIds, tenantId) {
    try {
      // Check if category group exists
      const group = await CategoryGroup.getById(categoryGroupId, tenantId);
      if (!group) {
        throw new Error(`Category group not found: ${categoryGroupId}`);
      }
      
      // Verify all categories exist and belong to the group
      for (const categoryId of categoryIds) {
        const category = await Category.getById(categoryId, tenantId);
        if (!category) {
          throw new Error(`Category not found: ${categoryId}`);
        }
        
        if (category.category_group_id !== categoryGroupId) {
          throw new Error(`Category ${categoryId} does not belong to group ${categoryGroupId}`);
        }
      }
      
      const success = await Category.reorder(categoryGroupId, categoryIds, tenantId);
      
      // Invalidate cache
      await this._invalidateCategoryCache(tenantId);
      
      logger.info(`Reordered categories in group ${categoryGroupId}`);
      return success;
    } catch (error) {
      logger.error(`Error reordering categories in group ${categoryGroupId}:`, error);
      throw error;
    }
  }

  /**
   * Get category hierarchy
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Category hierarchy
   */
  static async getCategoryHierarchy(tenantId) {
    try {
      // Check cache
      const cacheKey = `category-hierarchy:${tenantId}`;
      const cachedHierarchy = await redisClient.get(cacheKey);
      
      if (cachedHierarchy) {
        logger.debug('Retrieved category hierarchy from cache');
        return JSON.parse(cachedHierarchy);
      }
      
      const hierarchy = await CategoryGroup.getAllWithCategories(tenantId);
      
      // Cache hierarchy
      await redisClient.set(cacheKey, JSON.stringify(hierarchy), { EX: 3600 }); // Cache for 1 hour
      
      return hierarchy;
    } catch (error) {
      logger.error('Error getting category hierarchy:', error);
      throw error;
    }
  }

  /**
   * Add a category to a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} categoryId - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created recipe category
   */
  static async addCategoryToRecipe(recipeId, categoryId, tenantId) {
    try {
      // Check if recipe exists
      const recipe = await Recipe.getById(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Check if category exists
      const category = await Category.getById(categoryId, tenantId);
      if (!category) {
        throw new Error(`Category not found: ${categoryId}`);
      }
      
      const recipeCategory = await RecipeCategory.create({
        recipeId,
        categoryId,
        tenantId
      });
      
      // Invalidate cache
      await this._invalidateRecipeCategoryCache(recipeId, tenantId);
      
      logger.info(`Added category ${categoryId} to recipe ${recipeId}`);
      return {
        ...recipeCategory,
        category
      };
    } catch (error) {
      logger.error(`Error adding category ${categoryId} to recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a category from a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} categoryId - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeCategoryFromRecipe(recipeId, categoryId, tenantId) {
    try {
      const success = await RecipeCategory.delete(recipeId, categoryId, tenantId);
      
      if (!success) {
        throw new Error(`Category ${categoryId} not found on recipe ${recipeId}`);
      }
      
      // Invalidate cache
      await this._invalidateRecipeCategoryCache(recipeId, tenantId);
      
      logger.info(`Removed category ${categoryId} from recipe ${recipeId}`);
      return success;
    } catch (error) {
      logger.error(`Error removing category ${categoryId} from recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Set categories for a recipe (replace all existing categories)
   * @param {string} recipeId - Recipe ID
   * @param {Array} categoryIds - Category IDs
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Created recipe categories
   */
  static async setCategoriesForRecipe(recipeId, categoryIds, tenantId) {
    try {
      // Check if recipe exists
      const recipe = await Recipe.getById(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Check if all categories exist
      for (const categoryId of categoryIds) {
        const category = await Category.getById(categoryId, tenantId);
        if (!category) {
          throw new Error(`Category not found: ${categoryId}`);
        }
      }
      
      const recipeCategories = await RecipeCategory.setCategories(recipeId, categoryIds, tenantId);
      
      // Invalidate cache
      await this._invalidateRecipeCategoryCache(recipeId, tenantId);
      
      logger.info(`Set ${recipeCategories.length} categories for recipe ${recipeId}`);
      return recipeCategories;
    } catch (error) {
      logger.error(`Error setting categories for recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Get categories for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Categories
   */
  static async getCategoriesForRecipe(recipeId, tenantId) {
    try {
      // Check cache
      const cacheKey = `recipe-categories:${tenantId}:${recipeId}`;
      const cachedCategories = await redisClient.get(cacheKey);
      
      if (cachedCategories) {
        logger.debug(`Retrieved categories for recipe ${recipeId} from cache`);
        return JSON.parse(cachedCategories);
      }
      
      const categories = await Category.getByRecipeId(recipeId, tenantId);
      
      // Cache categories
      await redisClient.set(cacheKey, JSON.stringify(categories), { EX: 1800 }); // Cache for 30 minutes
      
      return categories;
    } catch (error) {
      logger.error(`Error getting categories for recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Get recipes for a category
   * @param {string} categoryId - Category ID
   * @param {Object} options - Query options
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Recipes
   */
  static async getRecipesForCategory(categoryId, options, tenantId) {
    try {
      // Check if category exists
      const category = await Category.getById(categoryId, tenantId);
      if (!category) {
        throw new Error(`Category not found: ${categoryId}`);
      }
      
      const recipes = await RecipeCategory.getByCategoryId(categoryId, options, tenantId);
      return recipes;
    } catch (error) {
      logger.error(`Error getting recipes for category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Auto-categorize a recipe based on rules
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Added categories
   */
  static async autoCategorizeRecipe(recipeId, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
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
      
      // Get all category rules with their conditions
      const rulesQuery = `
        SELECT 
          cr.id, 
          cr.category_id, 
          cr.rule_type, 
          cr.rule_value, 
          cr.priority,
          cr.conditions,
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
        let match = false;
        
        // Check if rule has compound conditions
        if (rule.conditions && rule.conditions.length > 0) {
          // Evaluate compound conditions
          const conditionResults = await Promise.all(
            rule.conditions.map(async (condition) => {
              const result = await this._evaluateRuleCondition(recipe, condition, tenantId);
              return { condition, result };
            })
          );
          
          // Apply logical operators (AND/OR)
          if (rule.conditions.length === 1) {
            match = conditionResults[0].result;
          } else {
            const operator = rule.conditions[0].operator || 'AND';
            match = conditionResults.reduce((acc, curr) => {
              return operator === 'AND' ? acc && curr.result : acc || curr.result;
            }, operator === 'AND');
          }
        } else {
          // Single rule evaluation
          match = await this._evaluateRuleCondition(recipe, rule, tenantId);
        }
        
        // If rule matches, add recipe to category
        if (match) {
          // Check if category is already assigned
          const checkQuery = `
            SELECT id
            FROM recipe_categories
            WHERE recipe_id = $1 AND category_id = $2 AND tenant_id = $3
          `;
          
          const checkResult = await pool.query(checkQuery, [
            recipeId, 
            rule.category_id, 
            tenantId
          ]);
          
          if (checkResult.rows.length === 0) {
            // Add category to recipe
            const insertQuery = `
              INSERT INTO recipe_categories (id, recipe_id, category_id, created_at, updated_at, tenant_id)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id, recipe_id, category_id, created_at, updated_at, tenant_id
            `;
            
            const now = new Date();
            const insertResult = await pool.query(insertQuery, [
              uuidv4(), 
              recipeId, 
              rule.category_id, 
              now, 
              now, 
              tenantId
            ]);
            
            matchedCategories.push({
              ...insertResult.rows[0],
              category_name: rule.category_name
            });
          }
        }
      }
      
      // If no categories were assigned, add default categories
      if (matchedCategories.length === 0) {
        const defaultsQuery = `
          SELECT c.id, c.name
          FROM categories c
          WHERE c.is_default = true AND c.tenant_id = $1
        `;
        
        const defaultsResult = await pool.query(defaultsQuery, [tenantId]);
        const defaultCategories = defaultsResult.rows;
        
        for (const category of defaultCategories) {
          // Check if category is already assigned
          const checkQuery = `
            SELECT id
            FROM recipe_categories
            WHERE recipe_id = $1 AND category_id = $2 AND tenant_id = $3
          `;
          
          const checkResult = await pool.query(checkQuery, [
            recipeId, 
            category.id, 
            tenantId
          ]);
          
          if (checkResult.rows.length === 0) {
            // Add category to recipe
            const insertQuery = `
              INSERT INTO recipe_categories (id, recipe_id, category_id, created_at, updated_at, tenant_id)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id, recipe_id, category_id, created_at, updated_at, tenant_id
            `;
            
            const now = new Date();
            const insertResult = await pool.query(insertQuery, [
              uuidv4(), 
              recipeId, 
              category.id, 
              now, 
              now, 
              tenantId
            ]);
            
            matchedCategories.push({
              ...insertResult.rows[0],
              category_name: category.name
            });
          }
        }
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return matchedCategories;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error auto-categorizing recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Evaluate a single rule condition
   * @private
   * @param {Object} recipe - Recipe object
   * @param {Object} rule - Rule object
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Whether the condition matches
   */
  static async _evaluateRuleCondition(recipe, rule, tenantId) {
    try {
      switch (rule.rule_type) {
        case 'tag':
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
          
          return tagResult.rows.length > 0;

        case 'ingredient':
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
          
          return ingredientResult.rows.length > 0;

        case 'name_contains':
          // Check if recipe name contains the specified text
          return recipe.title.toLowerCase().includes(
            rule.rule_value.text.toLowerCase()
          );

        case 'custom':
          // Use Ollama for custom rule evaluation
          const prompt = `
            Evaluate if this recipe matches the following rule:
            ${rule.rule_value.description}

            Recipe Title: ${recipe.title}
            Description: ${recipe.description}
            Instructions: ${recipe.instructions}

            Return a JSON object with a boolean 'matches' field.
          `;

          const response = await ollamaService.generate(prompt);
          const result = JSON.parse(response);
          return result.matches;

        default:
          return false;
      }
    } catch (error) {
      logger.error(`Error evaluating rule condition:`, error);
      return false;
    }
  }

  /**
   * Create a category rule
   * @param {Object} data - Category rule data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created category rule
   */
  static async createCategoryRule(data, tenantId) {
    try {
      // Check if category exists
      const category = await Category.getById(data.categoryId, tenantId);
      if (!category) {
        throw new Error(`Category not found: ${data.categoryId}`);
      }
      
      // Validate rule type
      const validRuleTypes = ['tag', 'ingredient', 'name_contains', 'custom'];
      if (!validRuleTypes.includes(data.ruleType)) {
        throw new Error(`Invalid rule type: ${data.ruleType}`);
      }
      
      // Validate rule value based on rule type
      if (data.ruleType === 'tag' && !data.ruleValue.tag_name) {
        throw new Error('Tag name is required for tag rules');
      } else if (data.ruleType === 'ingredient' && !data.ruleValue.ingredient_name) {
        throw new Error('Ingredient name is required for ingredient rules');
      } else if (data.ruleType === 'name_contains' && !data.ruleValue.text) {
        throw new Error('Text is required for name_contains rules');
      }
      
      const ruleData = {
        ...data,
        tenantId
      };
      
      const rule = await CategoryRule.create(ruleData);
      
      logger.info(`Created category rule ${rule.id} for category ${data.categoryId}`);
      return rule;
    } catch (error) {
      logger.error('Error creating category rule:', error);
      throw error;
    }
  }

  /**
   * Get a category rule by ID
   * @param {string} id - Category rule ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Category rule
   */
  static async getCategoryRule(id, tenantId) {
    try {
      const rule = await CategoryRule.getById(id, tenantId);
      
      if (!rule) {
        throw new Error(`Category rule not found: ${id}`);
      }
      
      return rule;
    } catch (error) {
      logger.error(`Error getting category rule ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all category rules
   * @param {Object} options - Query options
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Category rules
   */
  static async getCategoryRules(options, tenantId) {
    try {
      const rules = await CategoryRule.getAll(options, tenantId);
      return rules;
    } catch (error) {
      logger.error('Error getting category rules:', error);
      throw error;
    }
  }

  /**
   * Update a category rule
   * @param {string} id - Category rule ID
   * @param {Object} data - Category rule data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated category rule
   */
  static async updateCategoryRule(id, data, tenantId) {
    try {
      // Check if rule exists
      const existingRule = await CategoryRule.getById(id, tenantId);
      if (!existingRule) {
        throw new Error(`Category rule not found: ${id}`);
      }
      
      // Check if category is being changed and if it exists
      if (data.categoryId && data.categoryId !== existingRule.category_id) {
        const category = await Category.getById(data.categoryId, tenantId);
        if (!category) {
          throw new Error(`Category not found: ${data.categoryId}`);
        }
      }
      
      // Validate rule type if being changed
      if (data.ruleType && data.ruleType !== existingRule.rule_type) {
        const validRuleTypes = ['tag', 'ingredient', 'name_contains', 'custom'];
        if (!validRuleTypes.includes(data.ruleType)) {
          throw new Error(`Invalid rule type: ${data.ruleType}`);
        }
      }
      
      // Validate rule value if being changed
      if (data.ruleValue) {
        const ruleType = data.ruleType || existingRule.rule_type;
        
        if (ruleType === 'tag' && !data.ruleValue.tag_name) {
          throw new Error('Tag name is required for tag rules');
        } else if (ruleType === 'ingredient' && !data.ruleValue.ingredient_name) {
          throw new Error('Ingredient name is required for ingredient rules');
        } else if (ruleType === 'name_contains' && !data.ruleValue.text) {
          throw new Error('Text is required for name_contains rules');
        }
      }
      
      const rule = await CategoryRule.update(id, data, tenantId);
      
      logger.info(`Updated category rule ${id}`);
      return rule;
    } catch (error) {
      logger.error(`Error updating category rule ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a category rule
   * @param {string} id - Category rule ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteCategoryRule(id, tenantId) {
    try {
      // Check if rule exists
      const existingRule = await CategoryRule.getById(id, tenantId);
      if (!existingRule) {
        throw new Error(`Category rule not found: ${id}`);
      }
      
      const success = await CategoryRule.delete(id, tenantId);
      
      logger.info(`Deleted category rule ${id}`);
      return success;
    } catch (error) {
      logger.error(`Error deleting category rule ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get rules for a category
   * @param {string} categoryId - Category ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Category rules
   */
  static async getRulesForCategory(categoryId, tenantId) {
    try {
      // Check if category exists
      const category = await Category.getById(categoryId, tenantId);
      if (!category) {
        throw new Error(`Category not found: ${categoryId}`);
      }
      
      const rules = await CategoryRule.getByCategoryId(categoryId, tenantId);
      return rules;
    } catch (error) {
      logger.error(`Error getting rules for category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Generate category suggestions for a recipe using AI
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Category suggestions
   */
  static async generateCategorySuggestions(recipeId, tenantId) {
    try {
      // Check if recipe exists
      const recipe = await Recipe.getById(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      // Get all category groups with their categories
      const categoryGroups = await CategoryGroup.getAllWithCategories(tenantId);
      
      // Construct prompt for AI
      const prompt = `
        Analyze this recipe and suggest appropriate categories for it.
        
        Recipe Title: ${recipe.title}
        Description: ${recipe.description || 'N/A'}
        Ingredients: ${recipe.ingredients.map(i => i.ingredient.name).join(', ')}
        Instructions: ${recipe.instructions}
        
        Available categories by group:
        ${categoryGroups.map(group => {
          return `${group.name}:\n${group.categories.map(c => `- ${c.name}`).join('\n')}`;
        }).join('\n\n')}
        
        Return a JSON array of category IDs that are appropriate for this recipe, with a brief explanation for each.
        Format:
        [
          {
            "category_id": "uuid-here",
            "explanation": "Brief explanation of why this category is appropriate"
          }
        ]
      `;
      
      // Call Ollama service
      const response = await ollamaService.generateText(prompt);
      
      // Parse response
      let suggestions = [];
      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not extract JSON from response');
        }
      } catch (parseError) {
        logger.error(`Error parsing AI response for recipe ${recipeId}:`, parseError);
        throw parseError;
      }
      
      return suggestions;
    } catch (error) {
      logger.error(`Error generating category suggestions for recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk categorize multiple recipes
   * @param {Array} recipeIds - Array of recipe IDs
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Results of bulk categorization
   */
  static async bulkCategorizeRecipes(recipeIds, tenantId) {
    try {
      const results = {
        total: recipeIds.length,
        categorized: 0,
        failed: 0,
        details: []
      };

      for (const recipeId of recipeIds) {
        try {
          const categories = await this.autoCategorizeRecipe(recipeId, tenantId);
          results.categorized++;
          results.details.push({
            recipeId,
            success: true,
            categories: categories.map(c => c.category_name)
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            recipeId,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error bulk categorizing recipes:', error);
      throw error;
    }
  }

  /**
   * Get category suggestions for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Suggested categories with confidence scores
   */
  static async getCategorySuggestions(recipeId, tenantId) {
    try {
      // Get recipe details
      const recipe = await Recipe.getById(recipeId, tenantId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }

      // Get all categories
      const categories = await Category.getAll({}, tenantId);

      // Use Ollama to analyze recipe and suggest categories
      const prompt = `
        Analyze this recipe and suggest appropriate categories from the following list:
        ${categories.map(c => `- ${c.name}`).join('\n')}

        Recipe Title: ${recipe.title}
        Description: ${recipe.description}
        Instructions: ${recipe.instructions}

        Return a JSON array of objects with category names and confidence scores (0-1).
      `;

      const suggestions = await ollamaService.generate(prompt);
      const parsedSuggestions = JSON.parse(suggestions);

      // Validate and normalize suggestions
      return parsedSuggestions
        .filter(s => categories.some(c => c.name === s.category))
        .map(s => ({
          category: s.category,
          confidence: Math.min(Math.max(s.confidence, 0), 1)
        }))
        .sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      logger.error(`Error getting category suggestions for recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Validate and resolve category conflicts
   * @param {string} recipeId - Recipe ID
   * @param {Array} categoryIds - Category IDs to validate
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Validation results
   */
  static async validateCategories(recipeId, categoryIds, tenantId) {
    try {
      const results = {
        valid: [],
        conflicts: [],
        suggestions: []
      };

      // Get current categories
      const currentCategories = await this.getCategoriesForRecipe(recipeId, tenantId);
      const currentCategoryIds = currentCategories.map(c => c.id);

      // Check for conflicts
      for (const categoryId of categoryIds) {
        const category = await Category.getById(categoryId, tenantId);
        if (!category) {
          results.conflicts.push({
            categoryId,
            error: 'Category not found'
          });
          continue;
        }

        // Check for parent-child conflicts
        const parentCategory = await Category.getById(category.parent_id, tenantId);
        if (parentCategory && categoryIds.includes(parentCategory.id)) {
          results.conflicts.push({
            categoryId,
            error: `Conflict with parent category: ${parentCategory.name}`
          });
          continue;
        }

        // Check for sibling conflicts
        const siblings = await Category.getByParentId(category.parent_id, tenantId);
        const siblingConflicts = siblings
          .filter(s => s.id !== categoryId && categoryIds.includes(s.id))
          .map(s => s.name);

        if (siblingConflicts.length > 0) {
          results.conflicts.push({
            categoryId,
            error: `Conflict with sibling categories: ${siblingConflicts.join(', ')}`
          });
          continue;
        }

        results.valid.push(categoryId);
      }

      // Get suggestions for invalid categories
      if (results.conflicts.length > 0) {
        const suggestions = await this.getCategorySuggestions(recipeId, tenantId);
        results.suggestions = suggestions
          .filter(s => !categoryIds.includes(s.category))
          .slice(0, 5);
      }

      return results;
    } catch (error) {
      logger.error(`Error validating categories for recipe ${recipeId}:`, error);
      throw error;
    }
  }
}
