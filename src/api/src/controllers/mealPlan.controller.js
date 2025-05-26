const { MealPlanService } = require('../services');
const logger = require('../utils/logger');

/**
 * Meal Plan Controller
 */
class MealPlanController {
  /**
   * Get all meal plans for a household
   */
  static async getMealPlans(req, res) {
    try {
      const { householdId } = req.query;
      const mealPlans = await MealPlanService.getMealPlans(householdId, req.tenantId);
      res.json(mealPlans);
    } catch (error) {
      logger.error('Error getting meal plans:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get a meal plan by ID
   */
  static async getMealPlan(req, res) {
    try {
      const { id } = req.params;
      const mealPlan = await MealPlanService.getMealPlanById(id, req.tenantId);
      
      if (!mealPlan) {
        return res.status(404).json({ error: 'Meal plan not found' });
      }
      
      res.json(mealPlan);
    } catch (error) {
      logger.error(`Error getting meal plan ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create a new meal plan
   */
  static async createMealPlan(req, res) {
    try {
      const mealPlan = await MealPlanService.createMealPlan(req.body, req.tenantId);
      res.status(201).json(mealPlan);
    } catch (error) {
      logger.error('Error creating meal plan:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update a meal plan
   */
  static async updateMealPlan(req, res) {
    try {
      const { id } = req.params;
      const mealPlan = await MealPlanService.updateMealPlan(id, req.body, req.tenantId);
      
      if (!mealPlan) {
        return res.status(404).json({ error: 'Meal plan not found' });
      }
      
      res.json(mealPlan);
    } catch (error) {
      logger.error(`Error updating meal plan ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete a meal plan
   */
  static async deleteMealPlan(req, res) {
    try {
      const { id } = req.params;
      const success = await MealPlanService.deleteMealPlan(id, req.tenantId);
      
      if (!success) {
        return res.status(404).json({ error: 'Meal plan not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error(`Error deleting meal plan ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Generate meal suggestions for a plan
   */
  static async generateMealPlan(req, res) {
    try {
      const { id } = req.params;
      const suggestions = await MealPlanService.generateMealSuggestions(id, req.body, req.tenantId);
      res.json(suggestions);
    } catch (error) {
      logger.error(`Error generating meal suggestions for plan ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Approve a meal plan
   */
  static async approveMealPlan(req, res) {
    try {
      const { id } = req.params;
      const mealPlan = await MealPlanService.approveMealPlan(id, req.body, req.tenantId);
      
      if (!mealPlan) {
        return res.status(404).json({ error: 'Meal plan not found' });
      }
      
      res.json(mealPlan);
    } catch (error) {
      logger.error(`Error approving meal plan ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Reject a meal plan
   */
  static async rejectMealPlan(req, res) {
    try {
      const { id } = req.params;
      const mealPlan = await MealPlanService.rejectMealPlan(id, req.body, req.tenantId);
      
      if (!mealPlan) {
        return res.status(404).json({ error: 'Meal plan not found' });
      }
      
      res.json(mealPlan);
    } catch (error) {
      logger.error(`Error rejecting meal plan ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get shopping list for a meal plan
   */
  static async getShoppingList(req, res) {
    try {
      const { id } = req.params;
      const shoppingList = await MealPlanService.getShoppingList(id, req.tenantId);
      
      if (!shoppingList) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }
      
      res.json(shoppingList);
    } catch (error) {
      logger.error(`Error getting shopping list for meal plan ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = MealPlanController;
