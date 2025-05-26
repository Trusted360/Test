import api from './api';

/**
 * Service for managing pantry items (ingredient availability)
 */
const pantryService = {
  /**
   * Get all pantry items for the current user's household
   * @returns {Promise<Array>} List of pantry items
   */
  getPantryItems: async () => {
    const response = await api.get('/api/pantry');
    return response.data.data;
  },

  /**
   * Get a pantry item by ID
   * @param {string} id - Pantry item ID
   * @returns {Promise<Object>} Pantry item details
   */
  getPantryItemById: async (id) => {
    const response = await api.get(`/api/pantry/${id}`);
    return response.data.data;
  },

  /**
   * Get soon-to-expire pantry items
   * @param {number} days - Number of days threshold (default: 7)
   * @returns {Promise<Array>} List of expiring pantry items
   */
  getExpiringItems: async (days = 7) => {
    const response = await api.get(`/api/pantry/expiring?days=${days}`);
    return response.data.data;
  },

  /**
   * Add a new pantry item
   * @param {Object} item - Pantry item data
   * @param {string} item.ingredientId - Ingredient ID
   * @param {string} item.ingredientName - Ingredient name (for new ingredients)
   * @param {number} item.quantity - Quantity
   * @param {string} item.unitId - Unit ID
   * @param {Date} item.expiryDate - Expiry date (optional)
   * @param {string} item.notes - Notes (optional)
   * @returns {Promise<Object>} Created pantry item
   */
  addPantryItem: async (item) => {
    const response = await api.post('/api/pantry', item);
    return response.data.data;
  },

  /**
   * Add multiple pantry items at once
   * @param {Array<Object>} items - Array of pantry items
   * @returns {Promise<Array>} Created pantry items
   */
  bulkAddPantryItems: async (items) => {
    const response = await api.post('/api/pantry/bulk', { items });
    return response.data.data;
  },

  /**
   * Update a pantry item
   * @param {string} id - Pantry item ID
   * @param {Object} updates - Fields to update
   * @param {number} updates.quantity - Quantity (optional)
   * @param {string} updates.unitId - Unit ID (optional)
   * @param {Date} updates.expiryDate - Expiry date (optional)
   * @param {string} updates.notes - Notes (optional)
   * @returns {Promise<Object>} Updated pantry item
   */
  updatePantryItem: async (id, updates) => {
    const response = await api.put(`/api/pantry/${id}`, updates);
    return response.data.data;
  },

  /**
   * Delete a pantry item
   * @param {string} id - Pantry item ID
   * @returns {Promise<boolean>} Success status
   */
  deletePantryItem: async (id) => {
    const response = await api.delete(`/api/pantry/${id}`);
    return response.data.success;
  },

  /**
   * Check if there's enough of an ingredient available
   * @param {string} ingredientId - Ingredient ID
   * @param {number} quantity - Required quantity
   * @param {string} unitId - Unit ID
   * @returns {Promise<boolean>} Whether enough is available
   */
  checkIngredientAvailability: async (ingredientId, quantity, unitId) => {
    const response = await api.get(
      `/api/pantry/check/${ingredientId}?quantity=${quantity}&unitId=${unitId}`
    );
    return response.data.data.hasEnough;
  }
};

export default pantryService;