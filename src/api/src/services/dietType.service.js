const { DietType } = require('../models');
const logger = require('../utils/logger');

/**
 * DietType service
 */
class DietTypeService {
  /**
   * Get all diet types
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Diet types
   */
  static async getAllDietTypes(tenantId) {
    try {
      const dietTypes = await DietType.getAll(tenantId);
      return dietTypes;
    } catch (error) {
      logger.error('Error getting all diet types:', error);
      throw error;
    }
  }

  /**
   * Get a diet type by ID
   * @param {string} id - Diet type ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Diet type
   */
  static async getDietType(id, tenantId) {
    try {
      const dietType = await DietType.getById(id, tenantId);
      
      if (!dietType) {
        throw new Error(`Diet type not found: ${id}`);
      }
      
      return dietType;
    } catch (error) {
      logger.error(`Error getting diet type ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new diet type
   * @param {Object} data - Diet type data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created diet type
   */
  static async createDietType(data, tenantId) {
    try {
      const dietTypeData = {
        ...data,
        tenantId
      };
      
      const dietType = await DietType.create(dietTypeData);
      
      logger.info(`Created diet type ${dietType.id}`);
      return dietType;
    } catch (error) {
      logger.error('Error creating diet type:', error);
      throw error;
    }
  }

  /**
   * Update a diet type
   * @param {string} id - Diet type ID
   * @param {Object} data - Diet type data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated diet type
   */
  static async updateDietType(id, data, tenantId) {
    try {
      const dietType = await DietType.update(id, data, tenantId);
      
      if (!dietType) {
        throw new Error(`Diet type not found: ${id}`);
      }
      
      logger.info(`Updated diet type ${id}`);
      return dietType;
    } catch (error) {
      logger.error(`Error updating diet type ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a diet type
   * @param {string} id - Diet type ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteDietType(id, tenantId) {
    try {
      const success = await DietType.delete(id, tenantId);
      
      if (!success) {
        throw new Error(`Diet type not found: ${id}`);
      }
      
      logger.info(`Deleted diet type ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting diet type ${id}:`, error);
      throw error;
    }
  }
}

module.exports = DietTypeService;
