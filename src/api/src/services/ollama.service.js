const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { redisClient } = require('./redis');
const { mapOllamaError, ResponseParsingError } = require('../utils/error-handler');

// Create axios instance for Ollama API
const ollamaClient = axios.create({
  baseURL: process.env.OLLAMA_URL || config.ollama?.url || 'http://localhost:11434',
  timeout: 60000, // 60 seconds timeout for LLM operations
  headers: {
    'Content-Type': 'application/json'
  }
});

// Model configurations for different environments
const MODEL_CONFIGS = {
  demo: {
    primary: process.env.OLLAMA_MODEL_PRIMARY || 'llama3.2:3b-instruct-q4_K_M',
    fallback: process.env.OLLAMA_MODEL_FALLBACK || 'llama3.2:3b-instruct-q4_K_M',
    options: {
      temperature: 0.3,  // Lower temperature for more consistent, factual responses
      top_p: 0.8,
      num_ctx: parseInt(process.env.CHAT_CONTEXT_WINDOW) || 8192,
      num_gpu: 999,
      num_thread: 4,
      f16_kv: true,
      use_mlock: true
    }
  },
  production: {
    primary: 'llama3.2:3b-instruct-q4_K_M',
    fallback: 'gemma2:2b-instruct-q4_K_M',
    options: {
      temperature: 0.3,  // Lower temperature for more consistent, factual responses
      top_p: 0.8,
      num_ctx: 8192,
      num_gpu: 99,
      num_thread: 4
    }
  }
};

// Get current environment configuration
function getModelConfig() {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'demo';
  return MODEL_CONFIGS[env];
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Start with 1 second delay

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the function
 */
async function withRetry(fn, options = {}) {
  const { 
    maxRetries = MAX_RETRIES, 
    delayMs = RETRY_DELAY_MS,
    retryableErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', '429', '503', '504']
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Map to specific error type for clearer error reporting
      const mappedError = mapOllamaError(error);
      
      // Check if we should retry based on error type
      const statusCode = error.response?.status?.toString();
      const errorCode = error.code;
      
      const shouldRetry = 
        attempt <= maxRetries && 
        (retryableErrors.includes(statusCode) || 
         retryableErrors.includes(errorCode));
      
      if (!shouldRetry) {
        logger.error(`Request failed and will not be retried:`, {
          error: mappedError.message,
          status: statusCode,
          code: errorCode,
          attempt,
          maxRetries
        });
        throw mappedError;
      }
      
      // Calculate delay with exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      logger.warn(`Request failed, retrying (${attempt}/${maxRetries}) after ${delay}ms delay`, {
        error: mappedError.message,
        status: statusCode,
        code: errorCode
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should not happen but just in case
  throw mapOllamaError(lastError);
}

/**
 * Get available models from Ollama
 */
async function getModels() {
  try {
    // Check cache first
    const cachedModels = await redisClient.get('ollama:models');
    if (cachedModels) {
      logger.debug('Returning cached Ollama models');
      return JSON.parse(cachedModels);
    }

    // Fetch from Ollama API with retry
    const models = await withRetry(async () => {
      const response = await ollamaClient.get('/api/tags');
      return response.data.models || [];
    });
    
    // Cache results for 5 minutes
    await redisClient.set('ollama:models', JSON.stringify(models), { EX: 300 });
    
    return models;
  } catch (error) {
    logger.error('Error fetching Ollama models:', error);
    throw mapOllamaError(error);
  }
}

/**
 * Generate a meal plan using Ollama
 * @param {string} householdId - Household ID
 * @param {number} days - Number of days
 * @param {Array} preferences - Preferences
 * @param {Array} dietaryRestrictions - Dietary restrictions
 * @param {Array} availableIngredients - Available ingredients
 * @param {Array} excludedIngredients - Excluded ingredients
 * @returns {Promise<Object>} - Generated meal plan
 */
async function generateMealPlan(
  householdId, 
  days, 
  preferences = [], 
  dietaryRestrictions = [],
  availableIngredients = [],
  excludedIngredients = []
) {
  try {
    // Construct prompt for meal plan generation
    const prompt = constructMealPlanPrompt(
      days, 
      preferences, 
      dietaryRestrictions,
      availableIngredients,
      excludedIngredients
    );
    
    // Get default model
    const model = 'llama3'; // Default model
    
    // Call Ollama API with retry
    const response = await withRetry(async () => {
      return await ollamaClient.post('/api/generate', {
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2048
        }
      });
    });
    
    // Check for valid response
    if (!response.data || !response.data.response) {
      throw new ResponseParsingError('Invalid or empty response from Ollama API');
    }
    
    // Parse the response
    const mealPlan = parseMealPlanResponse(response.data.response);
    
    return {
      householdId,
      days,
      preferences,
      dietaryRestrictions,
      availableIngredients,
      excludedIngredients,
      mealPlan
    };
  } catch (error) {
    logger.error('Error generating meal plan with Ollama:', error);
    if (error.name === 'ResponseParsingError') {
      throw error;
    }
    throw mapOllamaError(error);
  }
}

/**
 * Generate a recipe using Ollama
 */
async function generateRecipe(ingredients, preferences = [], mealType = 'dinner') {
  try {
    // Construct prompt for recipe generation
    const prompt = constructRecipePrompt(ingredients, preferences, mealType);
    
    // Get default model
    const model = 'llama3'; // Default model
    
    // Call Ollama API with retry
    const response = await withRetry(async () => {
      return await ollamaClient.post('/api/generate', {
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2048
        }
      });
    });
    
    // Check for valid response
    if (!response.data || !response.data.response) {
      throw new ResponseParsingError('Invalid or empty response from Ollama API');
    }
    
    // Parse the response
    const recipe = parseRecipeResponse(response.data.response);
    
    return {
      ingredients,
      preferences,
      mealType,
      recipe
    };
  } catch (error) {
    logger.error('Error generating recipe with Ollama:', error);
    if (error.name === 'ResponseParsingError') {
      throw error;
    }
    throw mapOllamaError(error);
  }
}

/**
 * Analyze dietary preferences from text
 */
async function analyzeDietaryPreferences(text) {
  try {
    // Construct prompt for preference analysis
    const prompt = constructPreferenceAnalysisPrompt(text);
    
    // Get default model
    const model = 'llama3'; // Default model
    
    // Call Ollama API with retry
    const response = await withRetry(async () => {
      return await ollamaClient.post('/api/generate', {
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more deterministic results
          top_p: 0.9,
          max_tokens: 1024
        }
      });
    });
    
    // Check for valid response
    if (!response.data || !response.data.response) {
      throw new ResponseParsingError('Invalid or empty response from Ollama API');
    }
    
    // Parse the response
    const preferences = parsePreferenceResponse(response.data.response);
    
    return {
      text,
      preferences
    };
  } catch (error) {
    logger.error('Error analyzing preferences with Ollama:', error);
    if (error.name === 'ResponseParsingError') {
      throw error;
    }
    throw mapOllamaError(error);
  }
}

/**
 * Generate text using Ollama (generic method)
 */
async function generateText(prompt, options = {}) {
  try {
    // Default options
    const defaultOptions = {
      model: 'llama3',
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1024,
      timeout: 30000 // 30 seconds
    };
    
    // Merge with provided options
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Call Ollama API with retry and custom timeout
    const response = await withRetry(async () => {
      return await ollamaClient.post('/api/generate', {
        model: mergedOptions.model,
        prompt,
        stream: false,
        options: {
          temperature: mergedOptions.temperature,
          top_p: mergedOptions.top_p,
          max_tokens: mergedOptions.max_tokens
        }
      }, {
        timeout: mergedOptions.timeout
      });
    }, {
      maxRetries: options.maxRetries || MAX_RETRIES,
      delayMs: options.retryDelay || RETRY_DELAY_MS
    });
    
    if (!response.data || !response.data.response) {
      throw new ResponseParsingError('Invalid or empty response from Ollama API');
    }
    
    return response.data.response;
  } catch (error) {
    logger.error('Error generating text with Ollama:', error);
    if (error.name === 'ResponseParsingError') {
      throw error;
    }
    throw mapOllamaError(error);
  }
}

/**
 * Construct meal plan prompt
 * @param {number} days - Number of days
 * @param {Array} preferences - Preferences
 * @param {Array} dietaryRestrictions - Dietary restrictions
 * @param {Array} availableIngredients - Available ingredients
 * @param {Array} excludedIngredients - Excluded ingredients
 * @returns {string} - Meal plan prompt
 */
function constructMealPlanPrompt(
  days, 
  preferences = [], 
  dietaryRestrictions = [],
  availableIngredients = [],
  excludedIngredients = []
) {
  // Format dietary restrictions
  let restrictionsText = '';
  if (dietaryRestrictions && dietaryRestrictions.length > 0) {
    const allergyRestrictions = dietaryRestrictions
      .filter(r => r.type === 'allergy')
      .map(r => {
        const severity = r.severity ? ` (${r.severity} severity)` : '';
        return `- Allergy to ${r.value}${severity}`;
      });

    const dietRestrictions = dietaryRestrictions
      .filter(r => r.type === 'diet')
      .map(r => `- ${r.value} diet`);

    const otherRestrictions = dietaryRestrictions
      .filter(r => r.type === 'restriction')
      .map(r => {
        const reason = r.reason ? ` (${r.reason})` : '';
        return `- Restriction: ${r.value}${reason}`;
      });

    if (allergyRestrictions.length > 0) {
      restrictionsText += "Allergies:\n" + allergyRestrictions.join('\n') + '\n\n';
    }
    
    if (dietRestrictions.length > 0) {
      restrictionsText += "Diets:\n" + dietRestrictions.join('\n') + '\n\n';
    }
    
    if (otherRestrictions.length > 0) {
      restrictionsText += "Other Restrictions:\n" + otherRestrictions.join('\n') + '\n\n';
    }
  }

  // Format available ingredients
  let availableIngredientsText = '';
  if (availableIngredients && availableIngredients.length > 0) {
    availableIngredientsText = "Available Ingredients:\n" + 
      availableIngredients.map(i => `- ${i.name || i}`).join('\n') + '\n\n';
  }

  // Format excluded ingredients
  let excludedIngredientsText = '';
  if (excludedIngredients && excludedIngredients.length > 0) {
    excludedIngredientsText = "Excluded Ingredients:\n" + 
      excludedIngredients.map(i => `- ${i.name || i}`).join('\n') + '\n\n';
  }

  // Format preferences
  let preferencesText = '';
  if (preferences && preferences.length > 0) {
    preferencesText = "Preferences:\n" + 
      preferences.map(p => `- ${p.description || p}`).join('\n') + '\n\n';
  }

  // Construct full prompt
  return `You are a meal planning assistant for the Simmer app. Create a meal plan for ${days} days 
that respects the following constraints:

${restrictionsText}${availableIngredientsText}${excludedIngredientsText}${preferencesText}

Generate a meal plan with breakfast, lunch, and dinner for each day. For each meal, provide:
1. Recipe ID (you can make up realistic UUIDs)
2. Meal type (breakfast, lunch, or dinner)
3. Date (starting from today)
4. Number of servings
5. Any notes about the meal

Respond with a valid JSON object in the following format:
{
  "meals": [
    {
      "recipeId": "recipe-uuid",
      "type": "breakfast|lunch|dinner",
      "date": "YYYY-MM-DD",
      "servings": 4,
      "notes": "Any special notes"
    },
    ...more meals...
  ]
}`;
}

/**
 * Construct recipe prompt
 * @param {Array} ingredients - Ingredients
 * @param {Array} preferences - Preferences
 * @param {Array} dietaryRestrictions - Dietary restrictions
 * @param {string} mealType - Meal type
 * @returns {string} - Recipe prompt
 */
function constructRecipePrompt(
  ingredients, 
  preferences = [], 
  dietaryRestrictions = [],
  mealType = 'dinner'
) {
  // Format ingredients
  let ingredientsText = '';
  if (ingredients && ingredients.length > 0) {
    ingredientsText = "Ingredients:\n" + 
      ingredients.map(i => `- ${i.name || i.item || i}`).join('\n') + '\n\n';
  }

  // Format dietary restrictions
  let restrictionsText = '';
  if (dietaryRestrictions && dietaryRestrictions.length > 0) {
    const allergyRestrictions = dietaryRestrictions
      .filter(r => r.type === 'allergy')
      .map(r => {
        const severity = r.severity ? ` (${r.severity} severity)` : '';
        return `- Allergy to ${r.value}${severity}`;
      });

    const dietRestrictions = dietaryRestrictions
      .filter(r => r.type === 'diet')
      .map(r => `- ${r.value} diet`);

    const otherRestrictions = dietaryRestrictions
      .filter(r => r.type === 'restriction')
      .map(r => {
        const reason = r.reason ? ` (${r.reason})` : '';
        return `- Restriction: ${r.value}${reason}`;
      });

    if (allergyRestrictions.length > 0) {
      restrictionsText += "Allergies:\n" + allergyRestrictions.join('\n') + '\n\n';
    }
    
    if (dietRestrictions.length > 0) {
      restrictionsText += "Diets:\n" + dietRestrictions.join('\n') + '\n\n';
    }
    
    if (otherRestrictions.length > 0) {
      restrictionsText += "Other Restrictions:\n" + otherRestrictions.join('\n') + '\n\n';
    }
  }

  // Format preferences
  let preferencesText = '';
  if (preferences && preferences.length > 0) {
    preferencesText = "Preferences:\n" + 
      preferences.map(p => `- ${p.description || p}`).join('\n') + '\n\n';
  }

  // Construct full prompt
  return `You are a recipe generation assistant for the Simmer app. Create a ${mealType} recipe
using the given ingredients and respecting the constraints.

${ingredientsText}${restrictionsText}${preferencesText}

Generate a complete recipe with:
1. Title
2. Description
3. Ingredients list with quantities
4. Step-by-step instructions
5. Preparation time
6. Cooking time
7. Servings
8. Difficulty level

Respond with a valid JSON object in the following format:
{
  "recipe": {
    "title": "Recipe Title",
    "description": "Brief description",
    "ingredients": [
      {"name": "Ingredient 1", "quantity": "1 cup"},
      {"name": "Ingredient 2", "quantity": "2 tbsp"}
    ],
    "instructions": [
      "Step 1 description",
      "Step 2 description"
    ],
    "prepTime": 15,
    "cookTime": 30,
    "servings": 4,
    "difficulty": "easy|medium|hard"
  }
}`;
}

/**
 * Construct prompt for preference analysis
 */
function constructPreferenceAnalysisPrompt(text) {
  return `
You are a dietary preference analyzer. Analyze the following text and extract any dietary preferences, restrictions, or requirements:

"${text}"

Format your response as JSON with the following structure:
{
  "preferences": [
    {
      "type": "preference type (e.g., allergy, dislike, diet)",
      "value": "specific food or category",
      "confidence": 0.9 // between 0 and 1
    },
    ...
  ]
}

Only include preferences that are clearly stated or strongly implied in the text.
`;
}

/**
 * Safely parse JSON from LLM response
 * @param {string} text - Raw text from LLM
 * @returns {Object} - Parsed JSON object
 */
function parseResponseJson(text) {
  try {
    // Try direct parsing first
    try {
      return JSON.parse(text);
    } catch (e) {
      // Not a valid JSON, try to extract JSON from the text
      logger.debug('Initial JSON parse failed, trying to extract JSON from text');
    }
    
    // Look for JSON within markdown code blocks
    const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);
    
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (e) {
        logger.debug('JSON parse from code block failed');
      }
    }
    
    // Try to find any JSON-like structure with curly braces
    const curlyBraceRegex = /\{[\s\S]*\}/;
    const curlyMatch = text.match(curlyBraceRegex);
    
    if (curlyMatch) {
      try {
        return JSON.parse(curlyMatch[0]);
      } catch (e) {
        logger.debug('JSON parse from curly braces failed');
      }
    }
    
    // If all parsing attempts fail, throw an error
    throw new ResponseParsingError('Failed to parse JSON from LLM response');
  } catch (error) {
    logger.error('Error parsing JSON response:', error, { text });
    if (error.name === 'ResponseParsingError') {
      throw error;
    }
    throw new ResponseParsingError(`Failed to parse response: ${error.message}`);
  }
}

/**
 * Parse meal plan response from Ollama
 */
function parseMealPlanResponse(responseText) {
  try {
    // Parse JSON response
    const data = parseResponseJson(responseText);
    
    // Validate meal plan structure
    if (!data.mealPlan || !Array.isArray(data.mealPlan)) {
      throw new Error('Invalid meal plan structure: missing or invalid mealPlan array');
    }
    
    // Ensure each day has the required meals
    data.mealPlan.forEach((day, index) => {
      if (!day.day) day.day = index + 1;
      if (!day.meals) day.meals = [];
      
      // Ensure each meal has name and ingredients
      day.meals.forEach(meal => {
        if (!meal.name) meal.name = 'Untitled meal';
        if (!meal.ingredients) meal.ingredients = [];
        if (!meal.type) meal.type = 'other';
      });
    });
    
    return data.mealPlan;
  } catch (error) {
    logger.error('Error parsing meal plan response:', error);
    // Return a fallback structure
    return [{
      day: 1,
      meals: [
        { type: 'breakfast', name: 'Error parsing response', ingredients: [] },
        { type: 'lunch', name: 'Error parsing response', ingredients: [] },
        { type: 'dinner', name: 'Error parsing response', ingredients: [] }
      ]
    }];
  }
}

/**
 * Parse recipe response from Ollama
 */
function parseRecipeResponse(responseText) {
  try {
    // Parse JSON response
    const data = parseResponseJson(responseText);
    
    // Validate recipe structure
    if (!data.recipe) {
      throw new Error('Invalid recipe structure: missing recipe object');
    }
    
    const recipe = data.recipe;
    
    // Ensure required fields exist
    if (!recipe.name) recipe.name = 'Untitled Recipe';
    if (!recipe.description) recipe.description = 'No description provided';
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
      recipe.ingredients = [];
    }
    if (!recipe.instructions || !Array.isArray(recipe.instructions)) {
      recipe.instructions = [];
    }
    if (!recipe.tags || !Array.isArray(recipe.tags)) {
      recipe.tags = [];
    }
    
    // Convert any string values to number where needed
    recipe.prepTime = Number(recipe.prepTime) || 15;
    recipe.cookTime = Number(recipe.cookTime) || 30;
    recipe.servings = Number(recipe.servings) || 4;
    
    return recipe;
  } catch (error) {
    logger.error('Error parsing recipe response:', error);
    // Return a fallback structure
    return {
      name: 'Error Parsing Recipe',
      description: 'The AI response could not be parsed correctly.',
      prepTime: 15,
      cookTime: 30,
      servings: 4,
      ingredients: [],
      instructions: ['Please try again.'],
      tags: ['error']
    };
  }
}

/**
 * Parse preference response from Ollama
 */
function parsePreferenceResponse(responseText) {
  try {
    // Parse JSON response
    const data = parseResponseJson(responseText);
    
    // Validate preference structure
    if (!data.preferences || !Array.isArray(data.preferences)) {
      throw new Error('Invalid preference structure: missing or invalid preferences array');
    }
    
    return data.preferences;
  } catch (error) {
    logger.error('Error parsing preference response:', error);
    // Return a fallback structure
    return [];
  }
}

/**
 * Generate context-aware response for Trusted360
 */
async function generateTrusted360Response(prompt, context = {}, options = {}) {
  try {
    const modelConfig = getModelConfig();
    const model = options.model || modelConfig.primary;
    
    // Enhanced prompt with Trusted360 context
    const enhancedPrompt = buildTrusted360Prompt(prompt, context);
    
    // Merge options with model config
    const mergedOptions = {
      ...modelConfig.options,
      ...options,
      model
    };
    
    const response = await withRetry(async () => {
      return await ollamaClient.post('/api/generate', {
        model,
        prompt: enhancedPrompt,
        stream: false,
        options: mergedOptions
      });
    });
    
    if (!response.data || !response.data.response) {
      throw new ResponseParsingError('Invalid response from Ollama');
    }
    
    // Parse for actions if needed
    const parsedResponse = parseResponseForActions(response.data.response);
    
    return parsedResponse;
  } catch (error) {
    logger.error('Error generating Trusted360 response:', error);
    throw mapOllamaError(error);
  }
}

/**
 * Build Trusted360-specific prompt
 */
function buildTrusted360Prompt(userMessage, context) {
  let prompt = `You are a concise AI assistant for Trusted360, a self-storage security platform.

CRITICAL INSTRUCTIONS:
- Be EXTREMELY concise - answer in 1-2 sentences when possible
- ONLY reference data that actually exists in the context provided
- If you don't have specific information, say so briefly
- Avoid speculation or generating example data
- Focus on facts from the database

CURRENT CONTEXT:
`;

  // Add all properties context with exact data
  if (context.properties && context.properties.length > 0) {
    prompt += `EXACT PROPERTIES IN SYSTEM (${context.properties.length} total):
${context.properties.map(p => `- "${p.name}" at ${p.address} (Status: ${p.status})`).join('\n')}

`;
  } else {
    prompt += `NO PROPERTIES CONFIGURED IN SYSTEM YET.

`;
  }

  // Add all templates context with exact names
  if (context.templates && context.templates.length > 0) {
    prompt += `EXACT CHECKLIST TEMPLATES IN SYSTEM (${context.templates.length} total):
${context.templates.map(t => `- "${t.name}"${t.description ? `: ${t.description}` : ''}`).join('\n')}

`;
  } else {
    prompt += `NO CHECKLIST TEMPLATES CONFIGURED IN SYSTEM YET.

`;
  }

  // Add specific property context if available
  if (context.property) {
    prompt += `CURRENT PROPERTY FOCUS:
Property: ${context.property.name}
Address: ${context.property.address}
Status: ${context.property.status}

`;
  }

  // Add recent activity context with specific data
  if (context.checklists && context.checklists.length > 0) {
    prompt += `RECENT CHECKLISTS (last ${context.checklists.length}):
${context.checklists.map(c => {
      const propertyInfo = c.property_name ? ` at "${c.property_name}"` : '';
      const date = c.created_at ? new Date(c.created_at).toLocaleDateString() : '';
      return `- ${c.template_name} (${c.status})${propertyInfo} - ${date}`;
    }).join('\n')}

`;
  }

  if (context.alerts && context.alerts.length > 0) {
    prompt += `RECENT VIDEO ALERTS (last ${context.alerts.length}):
${context.alerts.map(a => {
      const propertyInfo = a.property_name ? ` at "${a.property_name}"` : '';
      const severity = a.severity || 'unknown';
      return `- ${a.alert_type_name} (${severity}, ${a.status})${propertyInfo}`;
    }).join('\n')}

`;
  }

  // Add conversation history if available
  if (context.conversation_history && context.conversation_history.length > 0) {
    prompt += `RECENT CONVERSATION:
${context.conversation_history.map(msg => {
      const sender = msg.sender_type === 'user' ? 'User' : 'Assistant';
      return `${sender}: ${msg.message_text}`;
    }).join('\n')}

`;
  }

  prompt += `RESPONSE RULES:
- MAXIMUM 1-2 sentences. Be extremely brief.
- If no data exists, just say "No [thing] configured yet."
- For counts, just say the number: "0 properties" or "5 templates"
- Never explain why there's no data or what could be done
- Never add filler phrases like "I don't have any specific information to share"
- Just state facts briefly

USER MESSAGE: ${userMessage}

ULTRA-BRIEF RESPONSE:`;

  return prompt;
}

/**
 * Parse response for executable actions
 */
function parseResponseForActions(responseText) {
  const actionRegex = /\[ACTION:\s*(\w+)(?:\s*-\s*(.+?))?\]/gi;
  const actions = [];
  let match;

  while ((match = actionRegex.exec(responseText)) !== null) {
    actions.push({
      type: match[1].toLowerCase(),
      description: match[2] || '',
      raw: match[0]
    });
  }

  // Clean response text
  const cleanText = responseText.replace(actionRegex, '').trim();

  return {
    text: cleanText,
    actions: actions,
    hasActions: actions.length > 0
  };
}

module.exports = {
  getModels,
  generateMealPlan,
  generateRecipe,
  analyzeDietaryPreferences,
  generateText,
  generateTrusted360Response,
  getModelConfig
};
