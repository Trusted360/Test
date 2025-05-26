const PantryItem = require('../models/pantryItem.model');
const logger = require('../utils/logger');

/**
 * Get all pantry items for current user's household
 */
const getPantryItems = async (req, res) => {
  try {
    const { householdId } = req.user;
    const tenantId = req.tenantId;
    
    if (!householdId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with a household'
      });
    }
    
    const pantryItems = await PantryItem.getByHousehold(householdId, tenantId);
    
    return res.status(200).json({
      success: true,
      data: pantryItems
    });
  } catch (error) {
    logger.error('Error in getPantryItems controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve pantry items',
      error: error.message
    });
  }
};

/**
 * Get a pantry item by ID
 */
const getPantryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const { householdId } = req.user;
    const tenantId = req.tenantId;
    
    if (!householdId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with a household'
      });
    }
    
    const pantryItem = await PantryItem.getById(id, tenantId);
    
    // Check if item exists and belongs to user's household
    if (!pantryItem || pantryItem.household_id !== householdId) {
      return res.status(404).json({
        success: false,
        message: 'Pantry item not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: pantryItem
    });
  } catch (error) {
    logger.error(`Error in getPantryItemById controller for ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve pantry item',
      error: error.message
    });
  }
};

/**
 * Get expiring pantry items
 */
const getExpiringItems = async (req, res) => {
  try {
    const { householdId } = req.user;
    const tenantId = req.tenantId;
    const { days = 7 } = req.query; // Default to 7 days
    
    if (!householdId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with a household'
      });
    }
    
    const expiringItems = await PantryItem.getExpiring(
      householdId, 
      tenantId, 
      parseInt(days, 10)
    );
    
    return res.status(200).json({
      success: true,
      data: expiringItems
    });
  } catch (error) {
    logger.error('Error in getExpiringItems controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve expiring pantry items',
      error: error.message
    });
  }
};

/**
 * Add a new pantry item
 */
const addPantryItem = async (req, res) => {
  try {
    const { householdId } = req.user;
    const tenantId = req.tenantId;
    const { 
      ingredientId, 
      ingredientName,
      quantity, 
      unitId, 
      expiryDate, 
      notes 
    } = req.body;
    
    if (!householdId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with a household'
      });
    }
    
    // Validate required fields
    if ((!ingredientId && !ingredientName) || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    const pantryItem = await PantryItem.create({
      householdId,
      ingredientId,
      ingredientName,
      quantity: parseFloat(quantity),
      unitId,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      notes,
      tenantId
    });
    
    return res.status(201).json({
      success: true,
      data: pantryItem
    });
  } catch (error) {
    logger.error('Error in addPantryItem controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add pantry item',
      error: error.message
    });
  }
};

/**
 * Add multiple pantry items at once
 */
const bulkAddPantryItems = async (req, res) => {
  try {
    const { householdId } = req.user;
    const tenantId = req.tenantId;
    const { items } = req.body;
    
    if (!householdId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with a household'
      });
    }
    
    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items must be a non-empty array'
      });
    }
    
    // Process items to ensure proper format
    const processedItems = items.map(item => ({
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      quantity: parseFloat(item.quantity),
      unitId: item.unitId,
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      notes: item.notes
    }));
    
    const pantryItems = await PantryItem.bulkAdd(processedItems, householdId, tenantId);
    
    return res.status(201).json({
      success: true,
      data: pantryItems
    });
  } catch (error) {
    logger.error('Error in bulkAddPantryItems controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk add pantry items',
      error: error.message
    });
  }
};

/**
 * Update a pantry item
 */
const updatePantryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { householdId } = req.user;
    const tenantId = req.tenantId;
    const { quantity, unitId, expiryDate, notes } = req.body;
    
    if (!householdId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with a household'
      });
    }
    
    // First check if the item exists and belongs to user's household
    const existingItem = await PantryItem.getById(id, tenantId);
    
    if (!existingItem || existingItem.household_id !== householdId) {
      return res.status(404).json({
        success: false,
        message: 'Pantry item not found'
      });
    }
    
    const updatedItem = await PantryItem.update(id, {
      quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
      unitId,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      notes
    }, tenantId);
    
    return res.status(200).json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    logger.error(`Error in updatePantryItem controller for ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update pantry item',
      error: error.message
    });
  }
};

/**
 * Delete a pantry item
 */
const deletePantryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { householdId } = req.user;
    const tenantId = req.tenantId;
    
    if (!householdId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with a household'
      });
    }
    
    // First check if the item exists and belongs to user's household
    const existingItem = await PantryItem.getById(id, tenantId);
    
    if (!existingItem || existingItem.household_id !== householdId) {
      return res.status(404).json({
        success: false,
        message: 'Pantry item not found'
      });
    }
    
    const deleted = await PantryItem.delete(id, tenantId);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete pantry item'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Pantry item deleted successfully'
    });
  } catch (error) {
    logger.error(`Error in deletePantryItem controller for ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete pantry item',
      error: error.message
    });
  }
};

/**
 * Check if household has enough of an ingredient
 */
const checkIngredientAvailability = async (req, res) => {
  try {
    const { ingredientId } = req.params;
    const { quantity, unitId } = req.query;
    const { householdId } = req.user;
    const tenantId = req.tenantId;
    
    if (!householdId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with a household'
      });
    }
    
    if (!ingredientId || !quantity || !unitId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    const hasEnough = await PantryItem.hasEnough(
      householdId,
      ingredientId,
      parseFloat(quantity),
      unitId,
      tenantId
    );
    
    return res.status(200).json({
      success: true,
      data: { hasEnough }
    });
  } catch (error) {
    logger.error(`Error in checkIngredientAvailability controller:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check ingredient availability',
      error: error.message
    });
  }
};

module.exports = {
  getPantryItems,
  getPantryItemById,
  getExpiringItems,
  addPantryItem,
  bulkAddPantryItems,
  updatePantryItem,
  deletePantryItem,
  checkIngredientAvailability
};