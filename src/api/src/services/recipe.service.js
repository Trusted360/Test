const { Recipe } = require('../models');
const logger = require('../utils/logger');

/**
 * Recipe service
 */
class RecipeService {
  /**
   * Create a new recipe
   * @param {Object} data - Recipe data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created recipe
   */
  static async createRecipe(data, tenantId) {
    try {
      const recipeData = {
        ...data,
        tenantId
      };
      
      const recipe = await Recipe.create(recipeData);
      
      logger.info(`Created recipe ${recipe.id}`);
      return recipe;
    } catch (error) {
      logger.error('Error creating recipe:', error);
      throw error;
    }
  }

  /**
   * Get a recipe by ID
   * @param {string} id - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Recipe
   */
  static async getRecipe(id, tenantId) {
    try {
      const recipe = await Recipe.getById(id, tenantId);
      
      if (!recipe) {
        throw new Error(`Recipe not found: ${id}`);
      }
      
      return recipe;
    } catch (error) {
      logger.error(`Error getting recipe ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search recipes
   * @param {Object} options - Search options
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
   * @returns {Promise<Object>} Object containing recipes array and pagination metadata
   */
  static async searchRecipes(options, tenantId) {
    try {
      // Map API parameter names to database column names
      const sortByMap = {
        'title': 'title',
        'prepTime': 'prep_time',
        'cookTime': 'cook_time',
        'totalTime': 'total_time',
        'rating': 'average_rating',
        'relevance': 'relevance',
        'createdAt': 'created_at'
      };

      // Normalize sort parameters
      let normalizedOptions = { ...options };
      
      if (options.sortBy) {
        normalizedOptions.sortBy = sortByMap[options.sortBy] || 'created_at';
      }
      
      if (options.sortDirection) {
        normalizedOptions.sortDirection = options.sortDirection.toUpperCase();
        if (!['ASC', 'DESC'].includes(normalizedOptions.sortDirection)) {
          normalizedOptions.sortDirection = 'DESC';
        }
      }

      const result = await Recipe.getAll(normalizedOptions, tenantId);
      
      // Format the response for the API
      return {
        recipes: result.recipes.map(recipe => ({
          id: recipe.id,
          title: recipe.highlight_title || recipe.title,
          description: recipe.highlight_description || recipe.description,
          prepTime: recipe.prep_time,
          cookTime: recipe.cook_time,
          totalTime: recipe.total_time,
          difficulty: recipe.difficulty,
          imageUrl: recipe.image_url,
          tags: recipe.tags,
          averageRating: parseFloat(recipe.average_rating) || 0,
          ratingCount: parseInt(recipe.rating_count) || 0,
          ingredientCount: parseInt(recipe.ingredient_count) || 0,
          createdAt: recipe.created_at,
          updatedAt: recipe.updated_at
        })),
        pagination: {
          total: result.totalCount,
          page: result.page,
          pageSize: result.pageSize,
          pageCount: result.pageCount
        }
      };
    } catch (error) {
      logger.error('Error searching recipes:', error);
      throw error;
    }
  }

  /**
   * Get recipe suggestions based on partial search term
   * @param {string} term - Partial search term
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Suggestions
   */
  static async getRecipeSuggestions(term, tenantId) {
    try {
      if (!term || term.length < 2) {
        return [];
      }

      const query = `
        WITH matching_recipes AS (
          SELECT 
            r.title,
            ts_rank(to_tsvector('english', r.title), plainto_tsquery('english', $1)) AS rank
          FROM 
            recipes r
          WHERE 
            r.tenant_id = $2 AND
            r.title ILIKE $3
          ORDER BY 
            rank DESC
          LIMIT 5
        ),
        matching_tags AS (
          SELECT 
            t.name,
            ts_rank(to_tsvector('english', t.name), plainto_tsquery('english', $1)) AS rank
          FROM 
            tags t
          WHERE 
            t.tenant_id = $2 AND
            t.name ILIKE $3
          ORDER BY 
            rank DESC
          LIMIT 3
        ),
        matching_ingredients AS (
          SELECT 
            i.name,
            ts_rank(to_tsvector('english', i.name), plainto_tsquery('english', $1)) AS rank
          FROM 
            ingredients i
          WHERE 
            i.tenant_id = $2 AND
            i.name ILIKE $3
          ORDER BY 
            rank DESC
          LIMIT 3
        )
        SELECT 'recipe' AS type, title AS text, rank FROM matching_recipes
        UNION ALL
        SELECT 'tag' AS type, name AS text, rank FROM matching_tags
        UNION ALL
        SELECT 'ingredient' AS type, name AS text, rank FROM matching_ingredients
        ORDER BY rank DESC, text ASC
        LIMIT 10
      `;

      const values = [term, tenantId, `%${term}%`];
      const result = await pool.query(query, values);
      
      return result.rows.map(row => ({
        type: row.type,
        text: row.text
      }));
    } catch (error) {
      logger.error('Error getting recipe suggestions:', error);
      throw new Error(`Failed to get recipe suggestions: ${error.message}`);
    }
  }

  /**
   * Update a recipe
   * @param {string} id - Recipe ID
   * @param {Object} data - Recipe data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated recipe
   */
  static async updateRecipe(id, data, tenantId) {
    try {
      const recipe = await Recipe.update(id, data, tenantId);
      
      if (!recipe) {
        throw new Error(`Recipe not found: ${id}`);
      }
      
      logger.info(`Updated recipe ${id}`);
      return recipe;
    } catch (error) {
      logger.error(`Error updating recipe ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a recipe
   * @param {string} id - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteRecipe(id, tenantId) {
    try {
      const success = await Recipe.delete(id, tenantId);
      
      if (!success) {
        throw new Error(`Recipe not found: ${id}`);
      }
      
      logger.info(`Deleted recipe ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting recipe ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add an ingredient to a recipe
   * @param {string} recipeId - Recipe ID
   * @param {Object} data - Ingredient data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created recipe ingredient
   */
  static async addIngredient(recipeId, data, tenantId) {
    try {
      // First check if recipe exists
      const recipe = await Recipe.getById(recipeId, tenantId);
      
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      
      const ingredientData = {
        ...data,
        recipeId,
        tenantId
      };
      
      const ingredient = await Recipe.addIngredient(ingredientData);
      
      logger.info(`Added ingredient ${ingredient.id} to recipe ${recipeId}`);
      return ingredient;
    } catch (error) {
      logger.error(`Error adding ingredient to recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Update a recipe ingredient
   * @param {string} id - Recipe ingredient ID
   * @param {Object} data - Ingredient data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated recipe ingredient
   */
  static async updateIngredient(id, data, tenantId) {
    try {
      const ingredient = await Recipe.updateIngredient(id, data, tenantId);
      
      if (!ingredient) {
        throw new Error(`Recipe ingredient not found: ${id}`);
      }
      
      logger.info(`Updated recipe ingredient ${id}`);
      return ingredient;
    } catch (error) {
      logger.error(`Error updating recipe ingredient ${id}:`, error);
      throw error;
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
      const success = await Recipe.removeIngredient(id, tenantId);
      
      if (!success) {
        throw new Error(`Recipe ingredient not found: ${id}`);
      }
      
      logger.info(`Removed ingredient ${id} from recipe`);
      return true;
    } catch (error) {
      logger.error(`Error removing ingredient ${id} from recipe:`, error);
      throw error;
    }
  }

  /**
   * Enrich a recipe with AI
   * @param {string} id - Recipe ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Enriched recipe
   */
  static async enrichRecipe(id, tenantId) {
    try {
      // First check if recipe exists
      const recipe = await Recipe.getById(id, tenantId);
      
      if (!recipe) {
        throw new Error(`Recipe not found: ${id}`);
      }
      
      // This is a placeholder for the actual AI-powered recipe enrichment
      // In a real implementation, this would call the Ollama service
      
      // For now, just add some tags if none exist
      if (!recipe.tags || recipe.tags.length === 0) {
        const updatedRecipe = await Recipe.update(id, {
          tags: ['enriched', 'ai-generated']
        }, tenantId);
        
        logger.info(`Enriched recipe ${id}`);
        return updatedRecipe;
      }
      
      return recipe;
    } catch (error) {
      logger.error(`Error enriching recipe ${id}:`, error);
      throw error;
    }
  }
}

module.exports = RecipeService;
