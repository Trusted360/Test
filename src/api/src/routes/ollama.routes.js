const express = require('express');
const router = express.Router();
const ollamaService = require('../services/ollama.service');
const logger = require('../utils/logger');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route GET /api/ollama/models
 * @description Get available Ollama models
 * @access Private
 */
router.get('/models', authMiddleware, async (req, res, next) => {
  try {
    const models = await ollamaService.getModels();
    res.json(models);
  } catch (error) {
    logger.error('Error fetching Ollama models:', error);
    next(error);
  }
});

/**
 * @route POST /api/ollama/generate-meal-plan
 * @description Generate a meal plan using Ollama
 * @access Private
 */
router.post('/generate-meal-plan', authMiddleware, async (req, res, next) => {
  try {
    const { householdId, days, preferences } = req.body;
    
    if (!householdId || !days) {
      return res.status(400).json({ 
        error: { 
          message: 'Missing required parameters: householdId and days are required',
          code: 'INVALID_REQUEST'
        } 
      });
    }
    
    const mealPlan = await ollamaService.generateMealPlan(householdId, days, preferences);
    res.json(mealPlan);
  } catch (error) {
    logger.error('Error generating meal plan:', error);
    next(error);
  }
});

/**
 * @route POST /api/ollama/generate-recipe
 * @description Generate a recipe using Ollama
 * @access Private
 */
router.post('/generate-recipe', authMiddleware, async (req, res, next) => {
  try {
    const { ingredients, preferences, mealType } = req.body;
    
    if (!ingredients || !ingredients.length) {
      return res.status(400).json({ 
        error: { 
          message: 'Missing required parameters: ingredients array is required',
          code: 'INVALID_REQUEST'
        } 
      });
    }
    
    const recipe = await ollamaService.generateRecipe(ingredients, preferences, mealType);
    res.json(recipe);
  } catch (error) {
    logger.error('Error generating recipe:', error);
    next(error);
  }
});

/**
 * @route POST /api/ollama/analyze-dietary-preferences
 * @description Analyze dietary preferences from text
 * @access Private
 */
router.post('/analyze-dietary-preferences', authMiddleware, async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: { 
          message: 'Missing required parameters: text is required',
          code: 'INVALID_REQUEST'
        } 
      });
    }
    
    const preferences = await ollamaService.analyzeDietaryPreferences(text);
    res.json(preferences);
  } catch (error) {
    logger.error('Error analyzing dietary preferences:', error);
    next(error);
  }
});

module.exports = router;
