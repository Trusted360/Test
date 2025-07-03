const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT token or session token and adds user to request object
 * @param {Object} sessionModel - Session model (injected by router)
 * @param {Object} userModel - User model (injected by router)
 */
const authMiddleware = (sessionModel, userModel) => async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NO_TOKEN'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    
    // First try to verify as a session token
    if (sessionModel) {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const session = await sessionModel.findByToken(token, tenantId);
      
      if (session) {
        // Get the user
        const user = await userModel.findById(session.user_id, tenantId);
        
        if (!user) {
          return res.status(401).json({ 
            success: false,
            error: {
              message: 'User not found',
              code: 'USER_NOT_FOUND'
            }
          });
        }
        
        // Update session activity
        await sessionModel.updateActivity(session.id, tenantId);
        
        // Add session and user info to request
        req.session = session;
        req.user = user;
        req.user.tenantId = tenantId;
        
        return next();
      }
    }
    
    // Fall back to JWT token verification
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Add user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId || req.headers['x-tenant-id'] || 'default'
      };
      
      next();
    } catch (jwtError) {
      logger.error('JWT verification error:', jwtError);
      return res.status(401).json({ 
        success: false,
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        }
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ 
      success: false,
      error: {
        message: 'Authentication error',
        code: 'AUTH_ERROR'
      }
    });
  }
};

/**
 * Simplified JWT authentication middleware
 * For routes that don't need the full session handling
 */
const authenticateJWT = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    // For API testing and development endpoints, bypass auth
    if (req.path.includes('/api/health') || req.path === '/api' || req.path === '/health') {
      return next();
    }
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NO_TOKEN'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Add user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId || req.headers['x-tenant-id'] || 'default'
      };
      
      next();
    } catch (jwtError) {
      logger.error('JWT verification error:', jwtError);
      return res.status(401).json({ 
        success: false,
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        }
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ 
      success: false,
      error: {
        message: 'Authentication error',
        code: 'AUTH_ERROR'
      }
    });
  }
};

/**
 * Check tenant middleware
 * Ensures tenant ID is set for multi-tenancy
 */
const checkTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        code: 'NO_USER'
      }
    });
  }

  // Set tenant ID from user or headers
  req.user.tenantId = req.user.tenantId || req.headers['x-tenant-id'] || 'default';
  
  next();
};

/**
 * Role-based authorization middleware
 * Checks if user has required role(s) - supports both single role and multiple roles
 */
function authorize(roles = []) {
  // Convert string to array if single role
  if (typeof roles === 'string') {
    roles = [roles];
  }
  
  return async (req, res, next) => {
    // Check if user exists
    if (!req.user) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden',
          code: 'FORBIDDEN'
        }
      });
    }
    
    // For backwards compatibility, check single role first
    if (req.user.role) {
      if (roles.length > 0 && !roles.includes(req.user.role)) {
        logger.warn(`Authorization failed: User ${req.user.id} with role ${req.user.role} attempted to access resource requiring roles: ${roles.join(', ')}`);
        
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
      }
      return next();
    }
    
    // Check new roles system
    try {
      const knex = req.app.locals.knex;
      if (!knex) {
        // Fallback if no database connection
        return res.status(500).json({
          success: false,
          error: {
            message: 'Database connection not available',
            code: 'DATABASE_ERROR'
          }
        });
      }
      
      const userRoles = await knex('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', req.user.id)
        .select('roles.name');
      
      const userRoleNames = userRoles.map(r => r.name);
      
      // Check if user has any of the required roles
      if (roles.length > 0 && !roles.some(role => userRoleNames.includes(role))) {
        logger.warn(`Authorization failed: User ${req.user.id} with roles [${userRoleNames.join(', ')}] attempted to access resource requiring roles: ${roles.join(', ')}`);
        
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
      }
      
      // Add user roles to request for future use
      req.user.roles = userRoleNames;
      
      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Authorization error',
          code: 'AUTH_ERROR'
        }
      });
    }
  };
}

/**
 * Email verification middleware
 * Ensures user has verified their email
 */
function requireEmailVerified() {
  return (req, res, next) => {
    // Check if user exists and has email_verified flag
    if (!req.user || req.user.email_verified === undefined) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden',
          code: 'FORBIDDEN'
        }
      });
    }
    
    // Check if email is verified
    if (!req.user.email_verified) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Email verification required',
          code: 'EMAIL_VERIFICATION_REQUIRED'
        }
      });
    }
    
    next();
  };
}

/**
 * Tenant isolation middleware
 * Ensures user can only access their tenant's data
 */
function tenantIsolation(req, res, next) {
  // Skip if multi-tenancy is not enabled
  if (!req.user || !req.user.tenantId) {
    return next();
  }
  
  // Set tenant context for database queries
  req.app.locals.tenantId = req.user.tenantId;
  
  // Set PostgreSQL session variable for row-level security
  const knex = req.app.locals.knex;
  if (knex) {
    knex.raw(`SET app.tenant_id = '${req.user.tenantId}'`)
      .then(() => next())
      .catch(error => {
        logger.error('Error setting tenant context:', error);
        next(error);
      });
  } else {
    next();
  }
}

module.exports = {
  authMiddleware,
  authenticateJWT,
  checkTenant,
  authorize,
  requireEmailVerified,
  tenantIsolation
};
