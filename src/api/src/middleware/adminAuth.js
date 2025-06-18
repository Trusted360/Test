const logger = require('../utils/logger');

/**
 * Admin authentication middleware
 * Verifies that the user has admin privileges
 */
const adminAuth = async (req, res, next) => {
  try {
    // Check if user is authenticated (should be handled by auth middleware first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has admin privileges
    const { admin_level } = req.user;
    
    if (!admin_level || admin_level === 'none') {
      logger.warn(`Admin access denied for user ${req.user.id} (${req.user.email}) - admin_level: ${admin_level}`);
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      });
    }

    // Log admin access for audit purposes
    logger.info(`Admin access granted for user ${req.user.id} (${req.user.email}) - admin_level: ${admin_level}`);

    // Add admin level to request for use in routes
    req.adminLevel = admin_level;
    req.isReadOnly = admin_level === 'read_only';

    next();
  } catch (error) {
    logger.error(`Admin auth middleware error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = adminAuth;
