const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const ollamaService = require('../../services/ollama.service');
const redis = require('../../services/redis');
const { ResponseParsingError } = require('../../utils/error-handler');

// Create a mock for axios
const mockAxios = new MockAdapter(axios);

// Mock the Redis client
jest.mock('../../services/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn()
  }
}));

describe('Ollama Service Integration Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockAxios.reset();
  });

  describe('getModels()', () => {
    it('should fetch models from Ollama API when cache is empty', async () => {
      // Mock Redis cache miss
      redis.redisClient.get.mockResolvedValue(null);
      
      // Mock successful Ollama API response
      mockAxios.onGet('/api/tags').reply(200, {
        models: [
          { name: 'llama3', modified_at: '2023-05-01T00:00:00Z' },
          { name: 'llama3-chat', modified_at: '2023-05-01T00:00:00Z' }
        ]
      });

      const result = await ollamaService.getModels();
      
      // Verify the result
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'llama3' }),
        expect.objectContaining({ name: 'llama3-chat' })
      ]));
      
      // Verify cache was checked and then updated
      expect(redis.redisClient.get).toHaveBeenCalledWith('ollama:models');
      expect(redis.redisClient.set).toHaveBeenCalled();
    });

    it('should return cached models when available', async () => {
      // Mock Redis cache hit
      const cachedModels = [
        { name: 'llama3', modified_at: '2023-05-01T00:00:00Z' }
      ];
      redis.redisClient.get.mockResolvedValue(JSON.stringify(cachedModels));
      
      const result = await ollamaService.getModels();
      
      // Verify the result matches cache
      expect(result).toEqual(cachedModels);
      
      // Verify API was not called
      expect(mockAxios.history.get).toHaveLength(0);
    });

    it('should retry on network error and eventually succeed', async () => {
      // Mock Redis cache miss
      redis.redisClient.get.mockResolvedValue(null);
      
      // Mock network failure on first two attempts, then success
      mockAxios.onGet('/api/tags')
        .replyOnce(503) // Server error
        .replyOnce(0) // Network error
        .replyOnce(200, { 
          models: [{ name: 'llama3', modified_at: '2023-05-01T00:00:00Z' }] 
        });

      const result = await ollamaService.getModels();
      
      // Verify the result
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('llama3');
      
      // Verify API was called multiple times
      expect(mockAxios.history.get).toHaveLength(3);
    });

    it('should throw an error after max retries', async () => {
      // Mock Redis cache miss
      redis.redisClient.get.mockResolvedValue(null);
      
      // Mock persistent failure
      mockAxios.onGet('/api/tags').reply(503);

      // Should throw after max retries
      await expect(ollamaService.getModels()).rejects.toThrow();
      
      // Verify API was called max+1 times (original request + max retries)
      expect(mockAxios.history.get.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('generateMealPlan()', () => {
    it('should generate a meal plan successfully', async () => {
      const mockResponse = {
        mealPlan: [
          {
            day: 1,
            meals: [
              { 
                type: 'breakfast', 
                name: 'Oatmeal with Fruit', 
                description: 'Hearty breakfast', 
                ingredients: ['oats', 'milk', 'banana'] 
              },
              { 
                type: 'lunch', 
                name: 'Quinoa Salad', 
                description: 'Light lunch', 
                ingredients: ['quinoa', 'cucumber', 'tomato'] 
              },
              { 
                type: 'dinner', 
                name: 'Pasta Primavera', 
                description: 'Pasta with vegetables', 
                ingredients: ['pasta', 'bell pepper', 'zucchini'] 
              }
            ]
          }
        ]
      };

      // Mock successful Ollama API response
      mockAxios.onPost('/api/generate').reply(200, {
        response: JSON.stringify(mockResponse)
      });

      const result = await ollamaService.generateMealPlan('household123', 1, ['vegetarian']);
      
      // Verify the result
      expect(result.mealPlan).toHaveLength(1);
      expect(result.mealPlan[0].meals).toHaveLength(3);
      expect(result.mealPlan[0].meals[0].name).toBe('Oatmeal with Fruit');
      
      // Verify API was called with correct parameters
      expect(mockAxios.history.post[0].data).toEqual(expect.stringContaining('llama3'));
      expect(mockAxios.history.post[0].data).toEqual(expect.stringContaining('vegetarian'));
    });

    it('should handle malformed JSON responses', async () => {
      // Mock an invalid JSON response
      mockAxios.onPost('/api/generate').reply(200, {
        response: `Here's your meal plan: 
        { 
          "mealPlan": [
            { "day": 1, "meals": [ ... ] }
          ]
        }`
      });

      // Should not throw but return a fallback structure
      const result = await ollamaService.generateMealPlan('household123', 1, []);
      
      // Verify fallback structure is returned
      expect(result.mealPlan).toBeDefined();
      expect(result.mealPlan).toHaveLength(1);
      expect(result.mealPlan[0].meals).toHaveLength(3);
      expect(result.mealPlan[0].meals[0].type).toBe('breakfast');
      expect(result.mealPlan[0].meals[0].name).toBe('Error parsing response');
    });

    it('should extract JSON from markdown code blocks', async () => {
      // Mock response with JSON in markdown code block
      const jsonInMarkdown = '```json\n{"mealPlan":[{"day":1,"meals":[{"type":"breakfast","name":"Smoothie Bowl","ingredients":["banana","berries","yogurt"]}]}]}\n```';
      
      mockAxios.onPost('/api/generate').reply(200, {
        response: jsonInMarkdown
      });

      const result = await ollamaService.generateMealPlan('household123', 1, []);
      
      // Verify the result was properly extracted
      expect(result.mealPlan).toHaveLength(1);
      expect(result.mealPlan[0].meals[0].name).toBe('Smoothie Bowl');
    });
  });

  describe('generateText()', () => {
    it('should generate text with custom options', async () => {
      // Mock successful response
      mockAxios.onPost('/api/generate').reply(200, {
        response: 'Generated text response'
      });

      const result = await ollamaService.generateText('Test prompt', {
        model: 'custom-model',
        temperature: 0.5,
        max_tokens: 500
      });
      
      // Verify result
      expect(result).toBe('Generated text response');
      
      // Verify custom options were used
      const requestData = JSON.parse(mockAxios.history.post[0].data);
      expect(requestData.model).toBe('custom-model');
      expect(requestData.options.temperature).toBe(0.5);
      expect(requestData.options.max_tokens).toBe(500);
    });

    it('should throw specific errors for different failure cases', async () => {
      // Mock model not found error
      mockAxios.onPost('/api/generate').reply(404, {
        error: "model 'non-existent-model' not found"
      });

      // Should throw ModelNotFoundError
      await expect(ollamaService.generateText('Test', {
        model: 'non-existent-model'
      })).rejects.toThrow('Model');
      
      // Reset mock
      mockAxios.reset();
      
      // Mock connection refused
      mockAxios.onPost('/api/generate').networkError();
      
      // Should throw OllamaApiError for connection issues
      await expect(ollamaService.generateText('Test')).rejects.toThrow('Ollama API Error');
    });
  });
}); 