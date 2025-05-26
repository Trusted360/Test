/**
 * Preference Adjustment Controller
 * 
 * Handles HTTP requests related to viewing and adjusting user preferences
 * that have been learned by the system.
 */

const { PreferenceLearningService } = require('../services');

class PreferenceAdjustmentController {
  /**
   * Get all learned preferences for a member
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMemberPreferences(req, res) {
    try {
      const { memberId } = req.params;
      const preferences = await PreferenceLearningService.getMemberPreferences(memberId);
      
      return res.status(200).json({
        success: true,
        data: preferences
      });
    } catch (error) {
      console.error('Error getting member preferences:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get member preferences',
        error: error.message
      });
    }
  }

  /**
   * Get preference categories for organizing the preference UI
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPreferenceCategories(req, res) {
    try {
      const categories = await PreferenceLearningService.getPreferenceCategories();
      
      return res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error getting preference categories:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get preference categories',
        error: error.message
      });
    }
  }

  /**
   * Update a specific preference for a member
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updatePreference(req, res) {
    try {
      const { memberId, preferenceId } = req.params;
      const { score, notes } = req.body;
      
      const updatedPreference = await PreferenceLearningService.updatePreference(
        memberId, 
        preferenceId, 
        score, 
        notes
      );
      
      return res.status(200).json({
        success: true,
        data: updatedPreference,
        message: 'Preference updated successfully'
      });
    } catch (error) {
      console.error('Error updating preference:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update preference',
        error: error.message
      });
    }
  }

  /**
   * Add a new preference for a member
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addPreference(req, res) {
    try {
      const { memberId } = req.params;
      const { tagId, score, notes } = req.body;
      
      const newPreference = await PreferenceLearningService.addPreference(
        memberId, 
        tagId, 
        score, 
        notes
      );
      
      return res.status(201).json({
        success: true,
        data: newPreference,
        message: 'Preference added successfully'
      });
    } catch (error) {
      console.error('Error adding preference:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add preference',
        error: error.message
      });
    }
  }

  /**
   * Delete a preference for a member
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deletePreference(req, res) {
    try {
      const { memberId, preferenceId } = req.params;
      
      await PreferenceLearningService.deletePreference(memberId, preferenceId);
      
      return res.status(200).json({
        success: true,
        message: 'Preference deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting preference:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete preference',
        error: error.message
      });
    }
  }

  /**
   * Reset all preferences for a member to system-learned defaults
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetPreferences(req, res) {
    try {
      const { memberId } = req.params;
      
      await PreferenceLearningService.resetPreferences(memberId);
      
      return res.status(200).json({
        success: true,
        message: 'Preferences reset successfully'
      });
    } catch (error) {
      console.error('Error resetting preferences:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to reset preferences',
        error: error.message
      });
    }
  }

  /**
   * Get preference insights for a member
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPreferenceInsights(req, res) {
    try {
      const { memberId } = req.params;
      
      const insights = await PreferenceLearningService.generatePreferenceInsights(memberId);
      
      return res.status(200).json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error getting preference insights:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get preference insights',
        error: error.message
      });
    }
  }

  /**
   * Get preference conflicts between household members
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHouseholdPreferenceConflicts(req, res) {
    try {
      const { householdId } = req.params;
      
      const conflicts = await PreferenceLearningService.getHouseholdPreferenceConflicts(householdId);
      
      return res.status(200).json({
        success: true,
        data: conflicts
      });
    } catch (error) {
      console.error('Error getting household preference conflicts:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get household preference conflicts',
        error: error.message
      });
    }
  }
}

module.exports = new PreferenceAdjustmentController();
