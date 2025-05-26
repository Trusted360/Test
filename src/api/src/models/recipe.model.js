const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url
});

/**
 * Recipe model
 */
class Recipe {
  /**
   * Create a new recipe
   * @param {Object} data - Recipe data
   * @param {string} data.name - Recipe name
   * @param {string} data.description - Recipe description
   * @param {string} data.instructions - Recipe instructions
   * @param {number} data.prepTime - Preparation time in minutes
   * @param {number} data.cookTime - Cooking time in minutes
   * @param {number} data.servings - Number of servings
   * @param {string} data.difficulty - Recipe difficulty
   * @param {string} data.sourceUrl - Source URL
   * @param {string} data.imageUrl - Image URL
   * @param {Array} data.tags - Recipe tags
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created recipe
   */
  static async create(data) {
    const { 
      name, 
      description, 
      instructions, 
      prepTime, 
      cookTime, 
      servings, 
      difficulty, 
      sourceUrl, 
      imageUrl, 
      tags = [],
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Insert recipe
      const recipeQuery = `
        INSERT INTO recipes (
          id, title, description, instructions, prep_time, cook_time, 
          total_time, difficulty, source_url, image_url, 
          created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, title, description, instructions, prep_time, cook_time, 
                  total_time, difficulty, source_url, image_url, 
                  created_at, updated_at, tenant_id
      `;
      
      const totalTime = (prepTime || 0) + (cookTime || 0);
      const recipeValues = [
        id, name, description, instructions, prepTime, cookTime, 
        totalTime, difficulty, sourceUrl, imageUrl, 
        createdAt, updatedAt, tenantId
      ];
      
      const recipeResult = await pool.query(recipeQuery, recipeValues);
      const recipe = recipeResult.rows[0];
      
      // Insert tags if provided
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          // Check if tag exists
          const tagQuery = `
            SELECT id FROM tags WHERE name = $1 AND tenant_id = $2
          `;
          const tagValues = [tag, tenantId];
          const tagResult = await pool.query(tagQuery, tagValues);
          
          let tagId;
          if (tagResult.rows.length === 0) {
            // Create tag if it doesn't exist
            const createTagQuery = `
              INSERT INTO tags (id, name, created_at, updated_at, tenant_id)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id
            `;
            const createTagValues = [uuidv4(), tag, createdAt, updatedAt, tenantId];
            const createTagResult = await pool.query(createTagQuery, createTagValues);
            tagId = createTagResult.rows[0].id;
          } else {
            tagId = tagResult.rows[0].id;
          }
          
          // Associate tag with recipe
          const recipeTagQuery = `
            INSERT INTO recipe_tags (id, recipe_id, tag_id, created_at, updated_at, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
          const recipeTagValues = [uuidv4(), id, tagId, createdAt, updatedAt, tenantId];
          await pool.query(recipeTagQuery, recipeTagValues);
        }
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      // Return recipe with tags
      recipe.tags = tags;
      return recipe;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error('Error creating recipe:', error);
      throw new Error(`Failed to create recipe: ${error.message}`);
    }
  }

  /**
   * Get a recipe by ID
   * @param {string} id - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Recipe
   */
  static async getById(id, tenantId) {
    try {
      // Get recipe
      const recipeQuery = `
        SELECT id, title, description, instructions, prep_time, cook_time, 
               total_time, difficulty, source_url, image_url, nutrition_info,
               created_at, updated_at, tenant_id
        FROM recipes
        WHERE id = $1 AND tenant_id = $2
      `;
      const recipeValues = [id, tenantId];
      const recipeResult = await pool.query(recipeQuery, recipeValues);
      
      if (recipeResult.rows.length === 0) {
        return null;
      }
      
      const recipe = recipeResult.rows[0];
      
      // Get recipe tags
      const tagsQuery = `
        SELECT t.name
        FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.recipe_id = $1 AND rt.tenant_id = $2
      `;
      const tagsValues = [id, tenantId];
      const tagsResult = await pool.query(tagsQuery, tagsValues);
      
      recipe.tags = tagsResult.rows.map(row => row.name);
      
      // Get recipe ingredients
      const ingredientsQuery = `
        SELECT ri.id, ri.quantity, ri.unit_id, ri.preparation, ri.optional,
               i.id as ingredient_id, i.name as ingredient_name, i.category,
               u.name as unit_name, u.symbol as unit_symbol
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        LEFT JOIN units u ON ri.unit_id = u.id
        WHERE ri.recipe_id = $1 AND ri.tenant_id = $2
      `;
      const ingredientsValues = [id, tenantId];
      const ingredientsResult = await pool.query(ingredientsQuery, ingredientsValues);
      
      recipe.ingredients = ingredientsResult.rows.map(row => ({
        id: row.id,
        ingredient: {
          id: row.ingredient_id,
          name: row.ingredient_name,
          category: row.category
        },
        quantity: row.quantity,
        unit: row.unit_id ? {
          id: row.unit_id,
          name: row.unit_name,
          symbol: row.unit_symbol
        } : null,
        preparation: row.preparation,
        optional: row.optional
      }));
      
      return recipe;
    } catch (error) {
      logger.error(`Error getting recipe ${id}:`, error);
      throw new Error(`Failed to get recipe: ${error.message}`);
    }
  }

  /**
   * Get all recipes
   * @param {Object} options - Query options
   * @param {string} options.search - Search term
   * @param {Array} options.tags - Tags to filter by
   * @param {string} options.difficulty - Difficulty level to filter by
   * @param {number} options.minRating - Minimum rating to filter by
   * @param {number} options.maxPrepTime - Maximum preparation time to filter by
   * @param {number} options.maxTotalTime - Maximum total time to filter by
   * @param {Array} options.ingredients - Ingredients to filter by
   * @param {string} options.sortBy - Field to sort by (title, prepTime, cookTime, totalTime, rating, relevance)
   * @param {string} options.sortDirection - Sort direction (ASC or DESC)
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Object containing recipes array and total count
   */
  static async getAll(options = {}, tenantId) {
    const { 
      search, 
      tags, 
      difficulty,
      minRating,
      maxPrepTime,
      maxTotalTime,
      ingredients,
      sortBy = 'created_at',
      sortDirection = 'DESC',
      limit = 20, 
      offset = 0 
    } = options;
    
    try {
      // Get total count of matching recipes
      const countQuery = `
        SELECT count_search_recipes(
          $1, $2, $3, $4, $5, $6, $7, $8
        ) AS total_count
      `;
      
      const countParams = [
        search,
        tags,
        difficulty,
        minRating,
        maxPrepTime,
        maxTotalTime,
        ingredients,
        tenantId
      ];
      
      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].total_count, 10);
      
      // Get matching recipes with pagination
      const searchQuery = `
        SELECT * FROM search_recipes(
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
      `;
      
      const searchParams = [
        search,
        tags,
        difficulty,
        minRating,
        maxPrepTime,
        maxTotalTime,
        ingredients,
        sortBy,
        sortDirection,
        limit,
        offset,
        tenantId
      ];
      
      const searchResult = await pool.query(searchQuery, searchParams);
      
      return {
        recipes: searchResult.rows,
        totalCount,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        pageCount: Math.ceil(totalCount / limit)
      };
    } catch (error) {
      logger.error('Error searching recipes:', error);
      throw new Error(`Failed to search recipes: ${error.message}`);
    }
  }

  /**
   * Update a recipe
   * @param {string} id - Recipe ID
   * @param {Object} data - Recipe data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated recipe
   */
  static async update(id, data, tenantId) {
    const { 
      name, 
      description, 
      instructions, 
      prepTime, 
      cookTime, 
      servings, 
      difficulty, 
      sourceUrl, 
      imageUrl, 
      tags
    } = data;
    
    const updatedAt = new Date();

    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Update recipe
      const totalTime = (prepTime || 0) + (cookTime || 0);
      
      const recipeQuery = `
        UPDATE recipes
        SET title = $1, description = $2, instructions = $3, 
            prep_time = $4, cook_time = $5, total_time = $6, 
            difficulty = $7, source_url = $8, image_url = $9, 
            updated_at = $10
        WHERE id = $11 AND tenant_id = $12
        RETURNING id, title, description, instructions, prep_time, cook_time, 
                  total_time, difficulty, source_url, image_url, 
                  created_at, updated_at, tenant_id
      `;
      
      const recipeValues = [
        name, description, instructions, 
        prepTime, cookTime, totalTime, 
        difficulty, sourceUrl, imageUrl, 
        updatedAt, id, tenantId
      ];
      
      const recipeResult = await pool.query(recipeQuery, recipeValues);
      
      if (recipeResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return null;
      }
      
      const recipe = recipeResult.rows[0];
      
      // Update tags if provided
      if (tags !== undefined) {
        // Remove existing tags
        const deleteTagsQuery = `
          DELETE FROM recipe_tags
          WHERE recipe_id = $1 AND tenant_id = $2
        `;
        const deleteTagsValues = [id, tenantId];
        await pool.query(deleteTagsQuery, deleteTagsValues);
        
        // Add new tags
        if (tags && tags.length > 0) {
          for (const tag of tags) {
            // Check if tag exists
            const tagQuery = `
              SELECT id FROM tags WHERE name = $1 AND tenant_id = $2
            `;
            const tagValues = [tag, tenantId];
            const tagResult = await pool.query(tagQuery, tagValues);
            
            let tagId;
            if (tagResult.rows.length === 0) {
              // Create tag if it doesn't exist
              const createTagQuery = `
                INSERT INTO tags (id, name, created_at, updated_at, tenant_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
              `;
              const createTagValues = [uuidv4(), tag, updatedAt, updatedAt, tenantId];
              const createTagResult = await pool.query(createTagQuery, createTagValues);
              tagId = createTagResult.rows[0].id;
            } else {
              tagId = tagResult.rows[0].id;
            }
            
            // Associate tag with recipe
            const recipeTagQuery = `
              INSERT INTO recipe_tags (id, recipe_id, tag_id, created_at, updated_at, tenant_id)
              VALUES ($1, $2, $3, $4, $5, $6)
            `;
            const recipeTagValues = [uuidv4(), id, tagId, updatedAt, updatedAt, tenantId];
            await pool.query(recipeTagQuery, recipeTagValues);
          }
        }
        
        recipe.tags = tags || [];
      } else {
        // Get existing tags
        const tagsQuery = `
          SELECT t.name
          FROM recipe_tags rt
          JOIN tags t ON rt.tag_id = t.id
          WHERE rt.recipe_id = $1 AND rt.tenant_id = $2
        `;
        const tagsValues = [id, tenantId];
        const tagsResult = await pool.query(tagsQuery, tagsValues);
        
        recipe.tags = tagsResult.rows.map(row => row.name);
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return recipe;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error updating recipe ${id}:`, error);
      throw new Error(`Failed to update recipe: ${error.message}`);
    }
  }

  /**
   * Delete a recipe
   * @param {string} id - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, tenantId) {
    try {
      // Start a transaction
      await pool.query('BEGIN');
      
      // Delete recipe tags
      const deleteTagsQuery = `
        DELETE FROM recipe_tags
        WHERE recipe_id = $1 AND tenant_id = $2
      `;
      const deleteTagsValues = [id, tenantId];
      await pool.query(deleteTagsQuery, deleteTagsValues);
      
      // Delete recipe ingredients
      const deleteIngredientsQuery = `
        DELETE FROM recipe_ingredients
        WHERE recipe_id = $1 AND tenant_id = $2
      `;
      const deleteIngredientsValues = [id, tenantId];
      await pool.query(deleteIngredientsQuery, deleteIngredientsValues);
      
      // Delete recipe
      const deleteRecipeQuery = `
        DELETE FROM recipes
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      const deleteRecipeValues = [id, tenantId];
      const result = await pool.query(deleteRecipeQuery, deleteRecipeValues);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      return result.rows.length > 0;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      logger.error(`Error deleting recipe ${id}:`, error);
      throw new Error(`Failed to delete recipe: ${error.message}`);
    }
  }

  /**
   * Add an ingredient to a recipe
   * @param {Object} data - Ingredient data
   * @param {string} data.recipeId - Recipe ID
   * @param {string} data.ingredientId - Ingredient ID
   * @param {number} data.quantity - Quantity
   * @param {string} data.unitId - Unit ID
   * @param {string} data.preparation - Preparation instructions
   * @param {boolean} data.optional - Whether the ingredient is optional
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created recipe ingredient
   */
  static async addIngredient(data) {
    const { 
      recipeId, 
      ingredientId, 
      quantity, 
      unitId, 
      preparation, 
      optional = false, 
      tenantId 
    } = data;
    
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    try {
      const query = `
        INSERT INTO recipe_ingredients (
          id, recipe_id, ingredient_id, quantity, unit_id, 
          preparation, optional, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, recipe_id, ingredient_id, quantity, unit_id, 
                  preparation, optional, created_at, updated_at, tenant_id
      `;
      
      const values = [
        id, recipeId, ingredientId, quantity, unitId, 
        preparation, optional, createdAt, updatedAt, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding ingredient to recipe:', error);
      throw new Error(`Failed to add ingredient to recipe: ${error.message}`);
    }
  }

  /**
   * Update a recipe ingredient
   * @param {string} id - Recipe ingredient ID
   * @param {Object} data - Ingredient data
   * @param {number} data.quantity - Quantity
   * @param {string} data.unitId - Unit ID
   * @param {string} data.preparation - Preparation instructions
   * @param {boolean} data.optional - Whether the ingredient is optional
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated recipe ingredient
   */
  static async updateIngredient(id, data, tenantId) {
    const { quantity, unitId, preparation, optional } = data;
    const updatedAt = new Date();

    try {
      const query = `
        UPDATE recipe_ingredients
        SET quantity = $1, unit_id = $2, preparation = $3, 
            optional = $4, updated_at = $5
        WHERE id = $6 AND tenant_id = $7
        RETURNING id, recipe_id, ingredient_id, quantity, unit_id, 
                  preparation, optional, created_at, updated_at, tenant_id
      `;
      
      const values = [
        quantity, unitId, preparation, 
        optional, updatedAt, id, tenantId
      ];
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating recipe ingredient ${id}:`, error);
      throw new Error(`Failed to update recipe ingredient: ${error.message}`);
    }
  }

  /**
   * Remove an ingredient from a recipe
   * @param {string} id - Recipe ingredient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeIngredient(id, tenantId) {
    try {
      const query = `
        DELETE FROM recipe_ingredients
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;
      
      const values = [id, tenantId];
      const result = await pool.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error removing ingredient from recipe ${id}:`, error);
      throw new Error(`Failed to remove ingredient from recipe: ${error.message}`);
    }
  }
}

module.exports = Recipe;
