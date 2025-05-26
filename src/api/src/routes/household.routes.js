const express = require('express');
const router = express.Router();
const { HouseholdService } = require('../services');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Get all households for a tenant
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const households = await HouseholdService.getHouseholds(req.tenantId);
    res.json(households);
  } catch (error) {
    logger.error('Error getting households:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a household by ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const household = await HouseholdService.getHouseholdById(req.params.id, req.tenantId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    res.json(household);
  } catch (error) {
    logger.error(`Error getting household ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new household
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const household = await HouseholdService.createHousehold(req.body, req.tenantId);
    res.status(201).json(household);
  } catch (error) {
    logger.error('Error creating household:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update a household
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const household = await HouseholdService.updateHousehold(req.params.id, req.body, req.tenantId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    res.json(household);
  } catch (error) {
    logger.error(`Error updating household ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a household
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const success = await HouseholdService.deleteHousehold(req.params.id, req.tenantId);
    if (!success) {
      return res.status(404).json({ error: 'Household not found' });
    }
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting household ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Add a member to a household
 */
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const member = await HouseholdService.addMember(req.params.id, req.body, req.tenantId);
    res.status(201).json(member);
  } catch (error) {
    logger.error(`Error adding member to household ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Remove a member from a household
 */
router.delete('/:id/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const success = await HouseholdService.removeMember(req.params.id, req.params.memberId, req.tenantId);
    if (!success) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.status(204).send();
  } catch (error) {
    logger.error(`Error removing member ${req.params.memberId} from household ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 