const express = require('express');
const { AuthController: AuthControllerClass } = require('../controllers');
const { authMiddleware: authMiddlewareFn, authorize } = require('../middleware/auth'); // Renamed
const logger = require('../utils/logger');

module.exports = function(services) { // Expects the full services object
  const router = express.Router();
  const authController = new AuthControllerClass(services.authService);
  const authMiddleware = authMiddlewareFn(services.sessionModel, services.userModel); // Initialize middleware

  /**
   * Authentication routes
   */

  // Public routes

  /**
   * @route POST /api/auth/register
   * @desc Register a new user
   * @access Public
   */
  router.post('/register', async (req, res, next) => {
    try {
      // Now call instance methods
      await authController.register(req, res, next);
    } catch (error) {
      logger.error('Register route error:', error);
      next(error);
    }
  });

  /**
   * @route POST /api/auth/login
   * @desc Login user
   * @access Public
   */
  router.post('/login', async (req, res, next) => {
    try {
      await authController.login(req, res, next);
    } catch (error) {
      logger.error('Login route error:', error);
      next(error);
    }
  });

  /**
   * @route POST /api/auth/verify-two-factor
   * @desc Verify two-factor authentication
   * @access Public
   */
  router.post('/verify-two-factor', async (req, res, next) => {
    try {
      await authController.verifyTwoFactor(req, res, next);
    } catch (error) {
      logger.error('Verify two-factor route error:', error);
      next(error);
    }
  });

  /**
   * @route GET /api/auth/verify-email/:token
   * @desc Verify user email
   * @access Public
   */
  router.get('/verify-email/:token', async (req, res, next) => {
    try {
      await authController.verifyEmail(req, res, next);
    } catch (error) {
      logger.error('Verify email route error:', error);
      next(error);
    }
  });

  /**
   * @route POST /api/auth/password-reset/request
   * @desc Request password reset
   * @access Public
   */
  router.post('/password-reset/request', async (req, res, next) => {
    try {
      await authController.requestPasswordReset(req, res, next);
    } catch (error) {
      logger.error('Password reset request route error:', error);
      next(error);
    }
  });

  /**
   * @route POST /api/auth/password-reset/reset
   * @desc Reset password
   * @access Public
   */
  router.post('/password-reset/reset', async (req, res, next) => {
    try {
      await authController.resetPassword(req, res, next);
    } catch (error) {
      logger.error('Password reset route error:', error);
      next(error);
    }
  });

  // Protected routes - require authentication
  router.use(authMiddleware); // Now use the initialized middleware

  /**
   * @route POST /api/auth/logout
   * @desc Logout user
   * @access Private
   */
  router.post('/logout', async (req, res, next) => {
    try {
      await authController.logout(req, res, next);
    } catch (error) {
      logger.error('Logout route error:', error);
      next(error);
    }
  });

  /**
   * @route POST /api/auth/email/resend-verification
   * @desc Resend email verification
   * @access Private
   */
  router.post('/email/resend-verification', async (req, res, next) => {
    try {
      await authController.resendEmailVerification(req, res, next);
    } catch (error) {
      logger.error('Resend email verification route error:', error);
      next(error);
    }
  });

  /**
   * @route GET /api/auth/two-factor/setup
   * @desc Set up two-factor authentication
   * @access Private
   */
  router.get('/two-factor/setup', async (req, res, next) => {
    try {
      await authController.setupTwoFactor(req, res, next);
    } catch (error) {
      logger.error('Two-factor setup route error:', error);
      next(error);
    }
  });

  /**
   * @route POST /api/auth/two-factor/enable
   * @desc Enable two-factor authentication
   * @access Private
   */
  router.post('/two-factor/enable', async (req, res, next) => {
    try {
      await authController.enableTwoFactor(req, res, next);
    } catch (error) {
      logger.error('Enable two-factor route error:', error);
      next(error);
    }
  });

  /**
   * @route POST /api/auth/two-factor/disable
   * @desc Disable two-factor authentication
   * @access Private
   */
  router.post('/two-factor/disable', async (req, res, next) => {
    try {
      await authController.disableTwoFactor(req, res, next);
    } catch (error) {
      logger.error('Disable two-factor route error:', error);
      next(error);
    }
  });

  /**
   * @route GET /api/auth/profile
   * @desc Get user profile
   * @access Private
   */
  router.get('/profile', async (req, res, next) => {
    try {
      await authController.getProfile(req, res, next);
    } catch (error) {
      logger.error('Get profile route error:', error);
      next(error);
    }
  });

  /**
   * @route PUT /api/auth/profile
   * @desc Update user profile
   * @access Private
   */
  router.put('/profile', async (req, res, next) => {
    try {
      await authController.updateProfile(req, res, next);
    } catch (error) {
      logger.error('Update profile route error:', error);
      next(error);
    }
  });

  /**
   * @route POST /api/auth/change-password
   * @desc Change user password
   * @access Private
   */
  router.post('/change-password', async (req, res, next) => {
    try {
      await authController.changePassword(req, res, next);
    } catch (error) {
      logger.error('Change password route error:', error);
      next(error);
    }
  });

  /**
   * @route GET /api/auth/users
   * @desc Get all users (admin only)
   * @access Private
   * @role admin
   */
  router.get('/users', authorize(['admin']), async (req, res, next) => {
    try {
      await authController.getAllUsers(req, res, next);
    } catch (error) {
      logger.error('Get all users route error:', error);
      next(error);
    }
  });

  /**
   * @route GET /api/auth/sessions
   * @desc Get user sessions
   * @access Private
   */
  router.get('/sessions', async (req, res, next) => {
    try {
      await authController.getUserSessions(req, res, next);
    } catch (error) {
      logger.error('Get user sessions route error:', error);
      next(error);
    }
  });

  /**
   * @route DELETE /api/auth/sessions/:sessionId
   * @desc Terminate session
   * @access Private
   */
  router.delete('/sessions/:sessionId', async (req, res, next) => {
    try {
      await authController.terminateSession(req, res, next);
    } catch (error) {
      logger.error('Terminate session route error:', error);
      next(error);
    }
  });

  /**
   * @route DELETE /api/auth/sessions/other
   * @desc Terminate all other sessions
   * @access Private
   */
  router.delete('/sessions/other', async (req, res, next) => {
    try {
      await authController.terminateOtherSessions(req, res, next);
    } catch (error) {
      logger.error('Terminate other sessions route error:', error);
      next(error);
    }
  });

  /**
   * @route GET /api/auth/activity
   * @desc Get user activity
   * @access Private
   */
  router.get('/activity', async (req, res, next) => {
    try {
      await authController.getUserActivity(req, res, next);
    } catch (error) {
      logger.error('Get user activity route error:', error);
      next(error);
    }
  });

  /**
   * @route PUT /api/auth/preferences
   * @desc Update user preferences
   * @access Private
   */
  router.put('/preferences', async (req, res, next) => {
    try {
      await authController.updateUserPreferences(req, res, next);
    } catch (error) {
      logger.error('Update user preferences route error:', error);
      next(error);
    }
  });

  return router;
}; // Close the function
