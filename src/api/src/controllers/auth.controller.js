const logger = require('../utils/logger');
const AuthService = require('../services/auth.service');

/**
 * Authentication controller for handling HTTP requests related to authentication
 */
class AuthController {
  /**
   * Create a new AuthController
   * @param {Object} authService - Authentication service
   */
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * Register a new user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      const tenantId = req.headers['x-tenant-id'] || 'default';

      const result = await this.authService.register({
        email,
        password,
        firstName,
        lastName,
        role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceInfo: req.body.deviceInfo
      }, tenantId);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful. Please check your email to verify your account.'
      });
    } catch (error) {
      logger.error('Registration error:', error);
      
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          error: {
            message: 'User with this email already exists',
            code: 'USER_EXISTS'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Login user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const tenantId = req.headers['x-tenant-id'] || 'default';

      const result = await this.authService.login({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceInfo: req.body.deviceInfo
      }, tenantId);

      // If 2FA is needed, return temporary token
      if (result.needsTwoFactor) {
        return res.status(200).json({
          success: true,
          data: {
            needsTwoFactor: true,
            tempToken: result.tempToken,
            userId: result.userId
          },
          message: 'Two-factor authentication required'
        });
      }

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Login error:', error);
      
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
          }
        });
      }
      
      if (error.message.includes('Invalid credentials. Account will be temporarily locked')) {
        return res.status(401).json({
          success: false,
          error: {
            message: error.message,
            code: 'INVALID_CREDENTIALS_WARNING'
          }
        });
      }
      
      if (error.message.includes('Account temporarily locked due to multiple failed login attempts')) {
        return res.status(401).json({
          success: false,
          error: {
            message: error.message,
            code: 'ACCOUNT_LOCKED'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Verify two-factor authentication
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async verifyTwoFactor(req, res, next) {
    try {
      const { userId, tempToken, token } = req.body;
      const tenantId = req.headers['x-tenant-id'] || 'default';
      
      const result = await this.authService.verifyTwoFactor({
        userId,
        tempToken,
        token,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceInfo: req.body.deviceInfo
      }, tenantId);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Two-factor verification error:', error);
      
      if (error.message === 'Invalid two-factor token') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid verification code',
            code: 'INVALID_2FA_TOKEN'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Logout user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async logout(req, res, next) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const tenantId = req.user.tenantId;
      
      await this.authService.logout(token, tenantId);
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      // Even if there's an error, we want to clear the user's session
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    }
  }

  /**
   * Verify email
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.params;
      const tenantId = req.headers['x-tenant-id'] || 'default';
      
      await this.authService.verifyEmail(token, tenantId);
      
      res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      
      if (error.message === 'Invalid verification token') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid verification token',
            code: 'INVALID_VERIFICATION_TOKEN'
          }
        });
      }
      
      if (error.message === 'Verification token has expired') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Verification token has expired',
            code: 'EXPIRED_VERIFICATION_TOKEN'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Resend email verification
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async resendEmailVerification(req, res, next) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      
      await this.authService.resendEmailVerification(userId, tenantId);
      
      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (error) {
      logger.error('Resend email verification error:', error);
      
      if (error.message === 'Email already verified') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email already verified',
            code: 'EMAIL_ALREADY_VERIFIED'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Refresh user token
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async refreshToken(req, res, next) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const result = await this.authService.refreshToken(userId, tenantId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      next(error);
    }
  }

  /**
   * Request password reset
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;
      const tenantId = req.headers['x-tenant-id'] || 'default';

      await this.authService.requestPasswordReset(email, tenantId);

      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    } catch (error) {
      logger.error('Password reset request error:', error);
      next(error);
    }
  }

  /**
   * Reset password
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      const tenantId = req.headers['x-tenant-id'] || 'default';

      await this.authService.resetPassword(token, password, tenantId);

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      logger.error('Password reset error:', error);
      
      if (error.message === 'Invalid or expired reset token') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid or expired reset token',
            code: 'INVALID_RESET_TOKEN'
          }
        });
      }
      
      if (error.message === 'Reset token has expired') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Reset token has expired',
            code: 'EXPIRED_RESET_TOKEN'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Set up two-factor authentication
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async setupTwoFactor(req, res, next) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      
      const setupInfo = await this.authService.setupTwoFactor(userId, tenantId);
      
      res.status(200).json({
        success: true,
        data: setupInfo
      });
    } catch (error) {
      logger.error('Two-factor setup error:', error);
      next(error);
    }
  }

  /**
   * Enable two-factor authentication
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async enableTwoFactor(req, res, next) {
    try {
      const { secret, token } = req.body;
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      
      await this.authService.enableTwoFactor(userId, secret, token, tenantId);
      
      res.status(200).json({
        success: true,
        message: 'Two-factor authentication enabled successfully'
      });
    } catch (error) {
      logger.error('Enable two-factor error:', error);
      
      if (error.message === 'Invalid verification token') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid verification code',
            code: 'INVALID_VERIFICATION_CODE'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Disable two-factor authentication
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async disableTwoFactor(req, res, next) {
    try {
      const { password } = req.body;
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      
      await this.authService.disableTwoFactor(userId, password, tenantId);
      
      res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled successfully'
      });
    } catch (error) {
      logger.error('Disable two-factor error:', error);
      
      if (error.message === 'Invalid password') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid password',
            code: 'INVALID_PASSWORD'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Get user profile
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const user = await this.authService.getUserProfile(userId, tenantId);

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  }

  /**
   * Update user profile
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { firstName, lastName, email } = req.body;

      const user = await this.authService.updateUserProfile(userId, {
        first_name: firstName,
        last_name: lastName,
        email
      }, tenantId);

      res.status(200).json({
        success: true,
        data: user,
        message: email !== user.email ? 'Profile updated. Please verify your new email address.' : 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      
      if (error.message === 'Email already in use') {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Email address is already in use',
            code: 'EMAIL_IN_USE'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Change user password
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { currentPassword, newPassword } = req.body;

      await this.authService.changePassword(userId, currentPassword, newPassword, tenantId);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      
      if (error.message === 'Current password is incorrect') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Current password is incorrect',
            code: 'INVALID_CURRENT_PASSWORD'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Get all users (admin only)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async getAllUsers(req, res, next) {
    try {
      const tenantId = req.user.tenantId;
      
      const users = await this.authService.getAllUsers(tenantId);
      
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      logger.error('Get all users error:', error);
      next(error);
    }
  }

  /**
   * Get user sessions
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async getUserSessions(req, res, next) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      
      const sessions = await this.authService.getUserSessions(userId, tenantId);
      
      res.status(200).json({
        success: true,
        data: sessions
      });
    } catch (error) {
      logger.error('Get user sessions error:', error);
      next(error);
    }
  }

  /**
   * Terminate session
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async terminateSession(req, res, next) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { sessionId } = req.params;
      
      await this.authService.terminateSession(userId, sessionId, tenantId);
      
      res.status(200).json({
        success: true,
        message: 'Session terminated successfully'
      });
    } catch (error) {
      logger.error('Terminate session error:', error);
      
      if (error.message === 'Session not found or does not belong to user') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND'
          }
        });
      }
      
      next(error);
    }
  }

  /**
   * Terminate all other sessions
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async terminateOtherSessions(req, res, next) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const currentSessionId = req.session.id; // Assuming session ID is stored in req.session
      
      const count = await this.authService.terminateOtherSessions(userId, currentSessionId, tenantId);
      
      res.status(200).json({
        success: true,
        data: { count },
        message: `${count} session(s) terminated successfully`
      });
    } catch (error) {
      logger.error('Terminate other sessions error:', error);
      next(error);
    }
  }

  /**
   * Get user activity
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async getUserActivity(req, res, next) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { page, limit, activityTypes, resourceTypes, startDate, endDate, sortBy, sortOrder } = req.query;
      
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        activityTypes: activityTypes ? activityTypes.split(',') : undefined,
        resourceTypes: resourceTypes ? resourceTypes.split(',') : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        sortBy,
        sortOrder
      };
      
      const activities = await this.authService.getUserActivity(userId, tenantId, options);
      
      res.status(200).json({
        success: true,
        data: activities
      });
    } catch (error) {
      logger.error('Get user activity error:', error);
      next(error);
    }
  }

  /**
   * Update user preferences
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async updateUserPreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const preferences = req.body;
      
      const user = await this.authService.updateUserPreferences(userId, preferences, tenantId);
      
      res.status(200).json({
        success: true,
        data: user.preferences,
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      logger.error('Update user preferences error:', error);
      next(error);
    }
  }
}

module.exports = AuthController;
