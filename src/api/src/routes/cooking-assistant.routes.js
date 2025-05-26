const express = require('express');
const { CookingAssistantController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/cooking-assistant/sessions
 * @desc Start a cooking session
 * @access Private
 */
router.post(
  '/sessions',
  authMiddleware,
  CookingAssistantController.startSession
);

/**
 * @route POST /api/cooking-assistant/sessions/:sessionId/messages
 * @desc Send a message to the cooking assistant
 * @access Private
 */
router.post(
  '/sessions/:sessionId/messages',
  authMiddleware,
  CookingAssistantController.sendMessage
);

/**
 * @route GET /api/cooking-assistant/sessions/:sessionId/next-step
 * @desc Get next step in the recipe
 * @access Private
 */
router.get(
  '/sessions/:sessionId/next-step',
  authMiddleware,
  CookingAssistantController.getNextStep
);

/**
 * @route GET /api/cooking-assistant/sessions/:sessionId/previous-step
 * @desc Get previous step in the recipe
 * @access Private
 */
router.get(
  '/sessions/:sessionId/previous-step',
  authMiddleware,
  CookingAssistantController.getPreviousStep
);

/**
 * @route POST /api/cooking-assistant/sessions/:sessionId/substitutions
 * @desc Get ingredient substitutions
 * @access Private
 */
router.post(
  '/sessions/:sessionId/substitutions',
  authMiddleware,
  CookingAssistantController.getIngredientSubstitutions
);

/**
 * @route POST /api/cooking-assistant/sessions/:sessionId/end
 * @desc End cooking session
 * @access Private
 */
router.post(
  '/sessions/:sessionId/end',
  authMiddleware,
  CookingAssistantController.endSession
);

/**
 * @route GET /api/cooking-assistant/members/:memberId/active-sessions
 * @desc Get active cooking sessions for a member
 * @access Private
 */
router.get(
  '/members/:memberId/active-sessions',
  authMiddleware,
  CookingAssistantController.getActiveSessions
);

module.exports = router;
