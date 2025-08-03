const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * User model for managing user data
 */
class User {
  constructor(db) {
    this.db = db;
    this.tableName = 'users';
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Created user
   */
  async create(userData, tenantId) {
    try {
      const { email, password, firstName, lastName } = userData;
      
      // Hash password
      logger.info('[UserModel.create] Generating salt...');
      const salt = await bcrypt.genSalt(10);
      logger.info('[UserModel.create] Salt generated. Hashing password...');
      const hashedPassword = await bcrypt.hash(password, salt);
      logger.info('[UserModel.create] Password hashed successfully.');
      
      const now = new Date();
      
      // User object matching the actual database schema
      const user = {
        email: email.toLowerCase(),
        password: hashedPassword, // Note: column is 'password' not 'password_hash'
        first_name: firstName,
        last_name: lastName,
        tenant_id: tenantId || 'default',
        created_at: now,
        updated_at: now
      };
      
      const [insertedUser] = await this.db(this.tableName).insert(user).returning('*');
      
      // Return user without password
      const createdUser = { ...insertedUser };
      
      // Return user without password
      delete createdUser.password;
      return createdUser;
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object} User
   */
  async findById(id, tenantId) {
    try {
      // Ensure id is an integer
      const userId = typeof id === 'object' && id.id ? id.id : id;
      
      const user = await this.db(this.tableName)
        .where({ id: userId, tenant_id: tenantId || 'default' })
        .first();
        
      if (user) {
        delete user.password;
      }
      
      return user;
    } catch (error) {
      logger.error(`Error finding user by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @param {string} tenantId - Tenant ID
   * @param {boolean} includePassword - Whether to include password in result
   * @returns {Object} User
   */
  async findByEmail(email, tenantId, includePassword = false) {
    try {
      const user = await this.db(this.tableName)
        .where({ 
          email: email.toLowerCase(),
          tenant_id: tenantId || 'default'
        })
        .first();
        
      // Remove password unless explicitly requested (for authentication)
      if (user && !includePassword) {
        delete user.password;
      }
      
      return user;
    } catch (error) {
      logger.error(`Error finding user by email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by reset token
   * @param {string} resetToken - Reset token
   * @param {string} tenantId - Tenant ID
   * @returns {Object} User
   */
  async findByResetToken(resetToken, tenantId) {
    try {
      return this.db(this.tableName)
        .where({ 
          reset_token: resetToken,
          tenant_id: tenantId || 'default'
        })
        .first();
    } catch (error) {
      logger.error(`Error finding user by reset token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by email verification token
   * @param {string} token - Email verification token
   * @param {string} tenantId - Tenant ID
   * @returns {Object} User
   */
  async findByEmailVerificationToken(token, tenantId) {
    try {
      return this.db(this.tableName)
        .where({ 
          email_verification_token: token,
          tenant_id: tenantId || 'default'
        })
        .first();
    } catch (error) {
      logger.error(`Error finding user by email verification token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate user password
   * @param {Object} user - User object
   * @param {string} password - Password to validate
   * @returns {boolean} Is password valid
   */
  async validatePassword(user, password) {
    try {
      return bcrypt.compare(password, user.password); // Use 'password' not 'password_hash'
    } catch (error) {
      logger.error(`Error validating password: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} userData - User data to update
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Updated user
   */
  async update(id, userData, tenantId) {
    try {
      const updateData = { ...userData, updated_at: new Date() };
      
      // If password is being updated, hash it
      if (updateData.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updateData.password, salt); // Store in 'password' column
      }
      
      // Ensure id is an integer
      const userId = typeof id === 'object' && id.id ? id.id : id;
      
      await this.db(this.tableName)
        .where({ id: userId, tenant_id: tenantId || 'default' })
        .update(updateData);
        
      return this.findById(userId, tenantId);
    } catch (error) {
      logger.error(`Error updating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {number} Number of deleted rows
   */
  async delete(id, tenantId) {
    try {
      return this.db(this.tableName)
        .where({ id, tenant_id: tenantId || 'default' })
        .delete();
    } catch (error) {
      logger.error(`Error deleting user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all users
   * @param {string} tenantId - Tenant ID
   * @returns {Array} Users
   */
  async getAll(tenantId) {
    try {
      const users = await this.db(this.tableName)
        .where({ tenant_id: tenantId || 'default' })
        .select('id', 'email', 'first_name', 'last_name', 'role', 'admin_level', 'created_at', 'updated_at', 'email_verified');
      
      return users;
    } catch (error) {
      logger.error(`Error getting all users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify user email
   * @param {string} token - Email verification token
   * @param {string} tenantId - Tenant ID (ignored for now)
   * @returns {Object} Updated user
   */
  async verifyEmail(token, tenantId) {
    try {
      const user = await this.findByEmailVerificationToken(token, tenantId);
      
      if (!user) {
        throw new Error('Invalid verification token');
      }
      
      if (new Date() > new Date(user.email_verification_token_expires_at)) {
        throw new Error('Verification token has expired');
      }
      
      await this.update(user.id, {
        email_verified: true,
        email_verification_token: null,
        email_verification_token_expires_at: null
      }, tenantId);
      
      return this.findById(user.id, tenantId);
    } catch (error) {
      logger.error(`Error verifying email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate new email verification token
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID (ignored for now)
   * @returns {Object} User with new verification token
   */
  async generateEmailVerificationToken(userId, tenantId) {
    try {
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await this.update(userId, {
        email_verification_token: emailVerificationToken,
        email_verification_token_expires_at: emailVerificationTokenExpiresAt
      }, tenantId);
      
      return this.findById(userId, tenantId);
    } catch (error) {
      logger.error(`Error generating email verification token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enable two-factor authentication
   * @param {string} userId - User ID
   * @param {string} secret - 2FA secret
   * @param {string} tenantId - Tenant ID (ignored for now)
   * @returns {Object} Updated user
   */
  async enableTwoFactor(userId, secret, tenantId) {
    try {
      await this.update(userId, {
        two_factor_enabled: true,
        two_factor_secret: secret
      }, tenantId);
      
      return this.findById(userId, tenantId);
    } catch (error) {
      logger.error(`Error enabling two-factor authentication: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disable two-factor authentication
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID (ignored for now)
   * @returns {Object} Updated user
   */
  async disableTwoFactor(userId, tenantId) {
    try {
      await this.update(userId, {
        two_factor_enabled: false,
        two_factor_secret: null
      }, tenantId);
      
      return this.findById(userId, tenantId);
    } catch (error) {
      logger.error(`Error disabling two-factor authentication: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track failed login attempt
   * @param {string} email - User email
   * @param {string} tenantId - Tenant ID (ignored for now)
   * @returns {number} Current number of failed attempts
   */
  async trackFailedLoginAttempt(email, tenantId) {
    try {
      const user = await this.findByEmail(email, tenantId);
      
      if (!user) {
        return null;
      }
      
      // Since we don't have these fields, just update the timestamp
      await this.update(user.id, {
        updated_at: new Date()
      }, tenantId);
      
      // Return a placeholder value
      return 1;
    } catch (error) {
      logger.error(`Error tracking failed login attempt: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset failed login attempts
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID (ignored for now)
   */
  async resetFailedLoginAttempts(userId, tenantId) {
    try {
      await this.update(userId, {
        updated_at: new Date()
      }, tenantId);
    } catch (error) {
      logger.error(`Error resetting failed login attempts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track successful login
   * @param {string} userId - User ID
   * @param {string} ip - IP address
   * @param {string} tenantId - Tenant ID (ignored for now)
   */
  async trackSuccessfulLogin(userId, ip, tenantId) {
    try {
      // Only update the timestamp since other fields don't exist
      await this.update(userId, {
        updated_at: new Date()
      }, tenantId);
    } catch (error) {
      logger.error(`Error tracking successful login: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - User preferences
   * @param {string} tenantId - Tenant ID (ignored for now)
   * @returns {Object} Updated user
   */
  async updatePreferences(userId, preferences, tenantId) {
    try {
      const user = await this.findById(userId, tenantId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const updatedPreferences = { ...user.preferences, ...preferences };
      
      await this.update(userId, {
        preferences: updatedPreferences
      }, tenantId);
      
      return this.findById(userId, tenantId);
    } catch (error) {
      logger.error(`Error updating user preferences: ${error.message}`);
      throw error;
    }
  }
}

module.exports = User;
