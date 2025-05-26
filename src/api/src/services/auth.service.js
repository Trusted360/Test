const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

/**
 * Authentication service for user authentication and authorization
 */
class AuthService {
  /**
   * Create a new AuthService
   * @param {Object} userModel - User model
   * @param {Object} sessionModel - Session model
   * @param {Object} userActivityModel - User activity model
   * @param {Object} emailService - Email service
   */
  constructor(userModel, sessionModel, userActivityModel, emailService) {
    this.userModel = userModel;
    this.sessionModel = sessionModel;
    this.userActivityModel = userActivityModel;
    this.emailService = emailService;
    console.log('[AuthService] Initialized with models:', !!userModel, !!sessionModel, !!userActivityModel);
  }

  // Static instance property
  static instance = null;

  /**
   * Initialize the AuthService with required models and services
   * @param {Object} userModel - User model
   * @param {Object} sessionModel - Session model
   * @param {Object} userActivityModel - User activity model
   * @param {Object} emailService - Email service
   * @returns {AuthService} AuthService instance
   */
  static initialize(userModel, sessionModel, userActivityModel, emailService) {
    if (!AuthService.instance) {
      console.log('[AuthService] Creating new instance with models');
      AuthService.instance = new AuthService(userModel, sessionModel, userActivityModel, emailService);
    }
    return AuthService.instance;
  }

  /**
   * Register a new user
   * @param {Object} userData - User data
   * @param {string} tenantId - Tenant ID
   * @returns {Object} User and token
   */
  async register(userData, tenantId) {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findByEmail(userData.email, tenantId);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create new user
      const user = await this.userModel.create(userData, tenantId);
      
      // Generate session token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Create session
      // const session = await this.sessionModel.create({ // Temporarily commented out
      //   userId: user.id,
      //   token,
      //   deviceInfo: userData.deviceInfo || 'Unknown device',
      //   ipAddress: userData.ipAddress,
      //   userAgent: userData.userAgent
      // }, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId: user.id,
        activityType: 'REGISTER',
        details: {
          email: user.email
        },
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: userData.ipAddress,
        userAgent: userData.userAgent
      }, tenantId);
      
      // Send verification email
      // if (this.emailService) { // Temporarily commented out
      //   await this.emailService.sendEmailVerification(
      //     user.email,
      //     user.first_name,
      //     user.email_verification_token
      //   );
      // } else {
      //   logger.warn(`Email verification not sent - email service not configured. Token: ${user.email_verification_token}`);
      // }
      
      return { user, token: token }; // Temporarily return the generated token directly
    } catch (error) {
      logger.error(`Registration error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Login user
   * @param {Object} loginData - Login data (email, password, deviceInfo, ipAddress, userAgent)
   * @param {string} tenantId - Tenant ID
   * @returns {Object} User and token
   */
  async login(loginData, tenantId) {
    try {
      const { email, password, deviceInfo, ipAddress, userAgent } = loginData;
      
      // Find user by email
      const user = await this.userModel.findByEmail(email, tenantId);
      if (!user) {
        // Track failed login for security
        await this.trackFailedLogin(email, ipAddress, tenantId);
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.lock_until && new Date() < new Date(user.lock_until)) {
        throw new Error('Account temporarily locked. Try again later.');
      }

      // Validate password
      const isValid = await this.userModel.validatePassword(user, password);
      if (!isValid) {
        // Track failed login
        await this.trackFailedLogin(email, ipAddress, tenantId);
        throw new Error('Invalid credentials');
      }

      // Check if 2FA is enabled
      const needsTwoFactor = user.two_factor_enabled;
      
      // If 2FA is enabled, don't create a full session yet
      if (needsTwoFactor) {
        // Generate temporary token for 2FA validation
        const tempToken = crypto.randomBytes(32).toString('hex');
        
        // Log activity
        await this.userActivityModel.logActivity({
          userId: user.id,
          activityType: 'LOGIN_2FA_REQUESTED',
          details: {
            email: user.email
          },
          resourceType: 'user',
          resourceId: user.id,
          ipAddress,
          userAgent
        }, tenantId);
        
        return { 
          needsTwoFactor: true,
          tempToken,
          userId: user.id
        };
      }
      
      // Track successful login
      await this.userModel.trackSuccessfulLogin(user.id, ipAddress, tenantId);
      
      // Generate session token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Create session
      const session = await this.sessionModel.create({
        userId: user.id,
        token,
        deviceInfo: deviceInfo || 'Unknown device',
        ipAddress,
        userAgent
      }, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId: user.id,
        activityType: 'LOGIN',
        details: {
          email: user.email
        },
        resourceType: 'user',
        resourceId: user.id,
        ipAddress,
        userAgent
      }, tenantId);
      
      // Remove password from user object
      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;
      
      return { 
        user: userWithoutPassword, 
        token: session.token,
        needsTwoFactor: false
      };
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track failed login attempt
   * @param {string} email - Email
   * @param {string} ipAddress - IP address
   * @param {string} tenantId - Tenant ID
   */
  async trackFailedLogin(email, ipAddress, tenantId) {
    try {
      const attempts = await this.userModel.trackFailedLoginAttempt(email, tenantId);
      
      // Log even if user doesn't exist for security monitoring
      logger.warn(`Failed login attempt for ${email} from ${ipAddress}. Attempts: ${attempts || 'N/A'}`);
    } catch (error) {
      logger.error(`Error tracking failed login: ${error.message}`);
      // Don't throw error to continue login flow
    }
  }

  /**
   * Verify two-factor authentication
   * @param {Object} verifyData - Verification data
   * @param {string} tenantId - Tenant ID
   * @returns {Object} User and token
   */
  async verifyTwoFactor(verifyData, tenantId) {
    try {
      const { userId, tempToken, token, deviceInfo, ipAddress, userAgent } = verifyData;
      
      // Get the user
      const user = await this.userModel.findById(userId, tenantId);
      if (!user) {
        throw new Error('Invalid user');
      }
      
      // Verify 2FA token
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token,
        window: 1 // Allow 30 seconds before/after
      });
      
      if (!verified) {
        // Log activity for failed 2FA
        await this.userActivityModel.logActivity({
          userId: user.id,
          activityType: 'LOGIN_2FA_FAILED',
          resourceType: 'user',
          resourceId: user.id,
          ipAddress,
          userAgent
        }, tenantId);
        
        throw new Error('Invalid two-factor token');
      }
      
      // Track successful login
      await this.userModel.trackSuccessfulLogin(user.id, ipAddress, tenantId);
      
      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Create session
      const session = await this.sessionModel.create({
        userId: user.id,
        token: sessionToken,
        deviceInfo: deviceInfo || 'Unknown device',
        ipAddress,
        userAgent
      }, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId: user.id,
        activityType: 'LOGIN_2FA_SUCCESS',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress,
        userAgent
      }, tenantId);
      
      // Remove password and 2FA secret from user object
      const userWithoutSensitive = { ...user };
      delete userWithoutSensitive.password;
      delete userWithoutSensitive.two_factor_secret;
      
      return { user: userWithoutSensitive, token: session.token };
    } catch (error) {
      logger.error(`Two-factor verification error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Logout user
   * @param {string} token - Session token
   * @param {string} tenantId - Tenant ID
   * @returns {boolean} Success
   */
  async logout(token, tenantId) {
    try {
      // Find session by token
      const session = await this.sessionModel.findByToken(token, tenantId);
      if (!session) {
        return true; // Already logged out
      }
      
      // Deactivate the session
      await this.sessionModel.deactivate(session.id, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId: session.user_id,
        activityType: 'LOGOUT',
        resourceType: 'session',
        resourceId: session.id,
        ipAddress: session.ip_address,
        userAgent: session.user_agent
      }, tenantId);
      
      return true;
    } catch (error) {
      logger.error(`Logout error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify user email
   * @param {string} token - Email verification token
   * @param {string} tenantId - Tenant ID
   * @returns {boolean} Success
   */
  async verifyEmail(token, tenantId) {
    try {
      const user = await this.userModel.verifyEmail(token, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId: user.id,
        activityType: 'EMAIL_VERIFIED'
      }, tenantId);
      
      return true;
    } catch (error) {
      logger.error(`Email verification error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resend email verification
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {boolean} Success
   */
  async resendEmailVerification(userId, tenantId) {
    try {
      const user = await this.userModel.findById(userId, tenantId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.email_verified) {
        throw new Error('Email already verified');
      }
      
      // Generate new token
      const updatedUser = await this.userModel.generateEmailVerificationToken(userId, tenantId);
      
      // Send verification email
      if (this.emailService) {
        await this.emailService.sendEmailVerification(
          updatedUser.email,
          updatedUser.first_name,
          updatedUser.email_verification_token
        );
      } else {
        logger.warn(`Email verification not sent - email service not configured. Token: ${updatedUser.email_verification_token}`);
      }
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId: user.id,
        activityType: 'EMAIL_VERIFICATION_RESENT'
      }, tenantId);
      
      return true;
    } catch (error) {
      logger.error(`Resend email verification error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @param {string} tenantId - Tenant ID
   * @returns {boolean} Success
   */
  async requestPasswordReset(email, tenantId) {
    try {
      const user = await this.userModel.findByEmail(email, tenantId);
      if (!user) {
        // For security reasons, don't reveal that the email doesn't exist
        return true;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

      // Update user with reset token
      await this.userModel.update(user.id, {
        reset_token: resetToken,
        reset_token_expires: resetTokenExpires
      }, tenantId);

      // Send password reset email
      if (this.emailService) {
        await this.emailService.sendPasswordReset(
          user.email,
          user.first_name,
          resetToken
        );
      } else {
        logger.warn(`Password reset email not sent - email service not configured. Token: ${resetToken}`);
      }
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId: user.id,
        activityType: 'PASSWORD_RESET_REQUESTED'
      }, tenantId);

      return true;
    } catch (error) {
      logger.error(`Password reset request error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate JWT token
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  }

  /**
   * Refresh user token
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object} User and token
   */
  async refreshToken(userId, tenantId) {
    try {
      const user = await this.userModel.findById(userId, tenantId);
      if (!user) {
        throw new Error('User not found');
      }

      const token = this.generateToken(user);
      return { user, token };
    } catch (error) {
      logger.error(`Token refresh error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset password
   * @param {string} resetToken - Reset token
   * @param {string} newPassword - New password
   * @param {string} tenantId - Tenant ID
   * @returns {boolean} Success
   */
  async resetPassword(resetToken, newPassword, tenantId) {
    try {
      // Find user with this reset token
      const user = await this.userModel.findByResetToken(resetToken, tenantId);
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Check if token is expired
      if (new Date() > new Date(user.reset_token_expires)) {
        throw new Error('Reset token has expired');
      }

      // Update password and clear reset token
      await this.userModel.update(user.id, {
        password: newPassword,
        reset_token: null,
        reset_token_expires: null
      }, tenantId);
      
      // Invalidate all user sessions for security
      await this.sessionModel.deactivateAllForUser(user.id, null, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId: user.id,
        activityType: 'PASSWORD_RESET_COMPLETED'
      }, tenantId);

      return true;
    } catch (error) {
      logger.error(`Password reset error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set up two-factor authentication
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object} 2FA setup info
   */
  async setupTwoFactor(userId, tenantId) {
    try {
      const user = await this.userModel.findById(userId, tenantId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Generate secret
      const secret = speakeasy.generateSecret({
        length: 20,
        name: `Simmer:${user.email}`
      });
      
      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
      
      // Return setup info but don't save yet (save after verification)
      return {
        secret: secret.base32,
        qrCode: qrCodeUrl
      };
    } catch (error) {
      logger.error(`Two-factor setup error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify and enable two-factor authentication
   * @param {string} userId - User ID
   * @param {string} secret - 2FA secret
   * @param {string} token - Verification token
   * @param {string} tenantId - Tenant ID
   * @returns {boolean} Success
   */
  async enableTwoFactor(userId, secret, token, tenantId) {
    try {
      // Verify token is valid
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1
      });
      
      if (!verified) {
        throw new Error('Invalid verification token');
      }
      
      // Enable 2FA
      await this.userModel.enableTwoFactor(userId, secret, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId,
        activityType: 'TWO_FACTOR_ENABLED'
      }, tenantId);
      
      return true;
    } catch (error) {
      logger.error(`Enable two-factor error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disable two-factor authentication
   * @param {string} userId - User ID
   * @param {string} password - User password
   * @param {string} tenantId - Tenant ID
   * @returns {boolean} Success
   */
  async disableTwoFactor(userId, password, tenantId) {
    try {
      const user = await this.userModel.findById(userId, tenantId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify password
      const isValid = await this.userModel.validatePassword(user, password);
      if (!isValid) {
        throw new Error('Invalid password');
      }
      
      // Disable 2FA
      await this.userModel.disableTwoFactor(userId, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId,
        activityType: 'TWO_FACTOR_DISABLED'
      }, tenantId);
      
      return true;
    } catch (error) {
      logger.error(`Disable two-factor error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object} User profile
   */
  async getUserProfile(userId, tenantId) {
    try {
      return this.userModel.findById(userId, tenantId);
    } catch (error) {
      logger.error(`Get user profile error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Updated user profile
   */
  async updateUserProfile(userId, profileData, tenantId) {
    try {
      // If email is changing, set it as unverified and generate a new token
      if (profileData.email) {
        const user = await this.userModel.findById(userId, tenantId);
        
        if (user.email !== profileData.email) {
          // Check if new email already exists
          const existingUser = await this.userModel.findByEmail(profileData.email, tenantId);
          if (existingUser) {
            throw new Error('Email already in use');
          }
          
          // Generate verification token
          const emailVerificationToken = crypto.randomBytes(32).toString('hex');
          const emailVerificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          
          // Update profile data with verification fields
          profileData.email_verified = false;
          profileData.email_verification_token = emailVerificationToken;
          profileData.email_verification_token_expires_at = emailVerificationTokenExpiresAt;
          
          // Send verification email for new address
          if (this.emailService) {
            await this.emailService.sendEmailVerification(
              profileData.email,
              profileData.first_name || user.first_name,
              emailVerificationToken
            );
          } else {
            logger.warn(`Email verification not sent - email service not configured. Token: ${emailVerificationToken}`);
          }
        }
      }
      
      // Update profile
      const updatedUser = await this.userModel.update(userId, profileData, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId,
        activityType: 'PROFILE_UPDATED',
        details: {
          updated_fields: Object.keys(profileData)
        }
      }, tenantId);
      
      return updatedUser;
    } catch (error) {
      logger.error(`Update user profile error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} tenantId - Tenant ID
   * @returns {boolean} Success
   */
  async changePassword(userId, currentPassword, newPassword, tenantId) {
    try {
      // Get user with password
      const user = await this.userModel.findById(userId, tenantId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Validate current password
      const isValid = await this.userModel.validatePassword(user, currentPassword);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      await this.userModel.update(userId, { password: newPassword }, tenantId);
      
      // Invalidate all sessions except current
      // TODO: Get current session ID from parameter if needed
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId,
        activityType: 'PASSWORD_CHANGED'
      }, tenantId);
      
      return true;
    } catch (error) {
      logger.error(`Change password error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all users
   * @param {string} tenantId - Tenant ID
   * @returns {Array} Users
   */
  async getAllUsers(tenantId) {
    try {
      return this.userModel.getAll(tenantId);
    } catch (error) {
      logger.error(`Get all users error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user sessions
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Array} Sessions
   */
  async getUserSessions(userId, tenantId) {
    try {
      return this.sessionModel.getActiveSessionsForUser(userId, tenantId);
    } catch (error) {
      logger.error(`Get user sessions error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Terminate session
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {string} tenantId - Tenant ID
   * @returns {boolean} Success
   */
  async terminateSession(userId, sessionId, tenantId) {
    try {
      // Verify session belongs to user
      const session = await this.sessionModel.findById(sessionId, tenantId);
      
      if (!session || session.user_id !== userId) {
        throw new Error('Session not found or does not belong to user');
      }
      
      // Deactivate session
      await this.sessionModel.deactivate(sessionId, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId,
        activityType: 'SESSION_TERMINATED',
        details: {
          session_id: sessionId
        }
      }, tenantId);
      
      return true;
    } catch (error) {
      logger.error(`Terminate session error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Terminate all sessions except current
   * @param {string} userId - User ID
   * @param {string} currentSessionId - Current session ID
   * @param {string} tenantId - Tenant ID
   * @returns {number} Number of terminated sessions
   */
  async terminateOtherSessions(userId, currentSessionId, tenantId) {
    try {
      const count = await this.sessionModel.deactivateAllForUser(userId, currentSessionId, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId,
        activityType: 'ALL_SESSIONS_TERMINATED',
        details: {
          count,
          except_session_id: currentSessionId
        }
      }, tenantId);
      
      return count;
    } catch (error) {
      logger.error(`Terminate other sessions error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user activity
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Array} User activities
   */
  async getUserActivity(userId, tenantId, options = {}) {
    try {
      return this.userActivityModel.getUserActivities(userId, tenantId, options);
    } catch (error) {
      logger.error(`Get user activity error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - User preferences
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Updated user
   */
  async updateUserPreferences(userId, preferences, tenantId) {
    try {
      const user = await this.userModel.updatePreferences(userId, preferences, tenantId);
      
      // Log activity
      await this.userActivityModel.logActivity({
        userId,
        activityType: 'PREFERENCES_UPDATED',
        details: {
          updated_preferences: Object.keys(preferences)
        }
      }, tenantId);
      
      return user;
    } catch (error) {
      logger.error(`Update user preferences error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AuthService;
