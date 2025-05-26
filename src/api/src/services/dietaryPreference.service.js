const { FoodAllergy, FoodPreference, Member } = require('../models');
const logger = require('../utils/logger');

/**
 * DietaryPreference service
 */
class DietaryPreferenceService {
  /**
   * Get all food allergies for a member
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Food allergies
   */
  static async getMemberAllergies(memberId, tenantId) {
    try {
      // First check if member exists
      const member = await Member.getById(memberId, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${memberId}`);
      }
      
      const allergies = await FoodAllergy.getByMemberId(memberId, tenantId);
      return allergies;
    } catch (error) {
      logger.error(`Error getting allergies for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Add a food allergy for a member
   * @param {string} memberId - Member ID
   * @param {Object} data - Food allergy data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created food allergy
   */
  static async addMemberAllergy(memberId, data, tenantId) {
    try {
      // First check if member exists
      const member = await Member.getById(memberId, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${memberId}`);
      }
      
      const allergyData = {
        ...data,
        memberId,
        tenantId
      };
      
      const allergy = await FoodAllergy.create(allergyData);
      
      logger.info(`Added food allergy ${allergy.id} to member ${memberId}`);
      return allergy;
    } catch (error) {
      logger.error(`Error adding food allergy to member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Update a food allergy
   * @param {string} id - Food allergy ID
   * @param {Object} data - Food allergy data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated food allergy
   */
  static async updateMemberAllergy(id, data, tenantId) {
    try {
      const allergy = await FoodAllergy.update(id, data, tenantId);
      
      if (!allergy) {
        throw new Error(`Food allergy not found: ${id}`);
      }
      
      logger.info(`Updated food allergy ${id}`);
      return allergy;
    } catch (error) {
      logger.error(`Error updating food allergy ${id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a food allergy
   * @param {string} id - Food allergy ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeMemberAllergy(id, tenantId) {
    try {
      const success = await FoodAllergy.delete(id, tenantId);
      
      if (!success) {
        throw new Error(`Food allergy not found: ${id}`);
      }
      
      logger.info(`Removed food allergy ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error removing food allergy ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all food preferences for a member
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Food preferences
   */
  static async getMemberPreferences(memberId, tenantId) {
    try {
      // First check if member exists
      const member = await Member.getById(memberId, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${memberId}`);
      }
      
      const preferences = await FoodPreference.getByMemberId(memberId, tenantId);
      return preferences;
    } catch (error) {
      logger.error(`Error getting preferences for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Get liked and disliked ingredients for a member
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Liked and disliked ingredients
   */
  static async getMemberLikesAndDislikes(memberId, tenantId) {
    try {
      // First check if member exists
      const member = await Member.getById(memberId, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${memberId}`);
      }
      
      const likesAndDislikes = await FoodPreference.getLikesAndDislikes(memberId, tenantId);
      return likesAndDislikes;
    } catch (error) {
      logger.error(`Error getting likes and dislikes for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Set a food preference for a member
   * @param {string} memberId - Member ID
   * @param {Object} data - Food preference data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created or updated food preference
   */
  static async setMemberPreference(memberId, data, tenantId) {
    try {
      // First check if member exists
      const member = await Member.getById(memberId, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${memberId}`);
      }
      
      const preferenceData = {
        ...data,
        memberId,
        tenantId
      };
      
      const preference = await FoodPreference.setPreference(preferenceData);
      
      logger.info(`Set food preference ${preference.id} for member ${memberId}`);
      return preference;
    } catch (error) {
      logger.error(`Error setting food preference for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a food preference
   * @param {string} id - Food preference ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async removeMemberPreference(id, tenantId) {
    try {
      const success = await FoodPreference.delete(id, tenantId);
      
      if (!success) {
        throw new Error(`Food preference not found: ${id}`);
      }
      
      logger.info(`Removed food preference ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error removing food preference ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a member's complete dietary profile
   * @param {string} memberId - Member ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Dietary profile
   */
  static async getMemberDietaryProfile(memberId, tenantId) {
    try {
      // First check if member exists
      const member = await Member.getById(memberId, tenantId);
      
      if (!member) {
        throw new Error(`Member not found: ${memberId}`);
      }
      
      // Get diets, allergies, and preferences in parallel
      const [diets, allergies, preferences, likesAndDislikes] = await Promise.all([
        Member.getDietaryPreferences(memberId, tenantId),
        FoodAllergy.getByMemberId(memberId, tenantId),
        FoodPreference.getByMemberId(memberId, tenantId),
        FoodPreference.getLikesAndDislikes(memberId, tenantId)
      ]);
      
      return {
        member: {
          id: member.id,
          name: member.name
        },
        diets,
        allergies,
        preferences,
        likes: likesAndDislikes.likes || [],
        dislikes: likesAndDislikes.dislikes || []
      };
    } catch (error) {
      logger.error(`Error getting dietary profile for member ${memberId}:`, error);
      throw error;
    }
  }
}

module.exports = DietaryPreferenceService;
