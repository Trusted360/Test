const logger = require('../utils/logger');

/**
 * Audit middleware to capture request context and inject audit service
 * @param {Object} auditService - Instance of AuditService
 */
const auditMiddleware = (auditService) => {
  return (req, res, next) => {
    try {
      // Capture request context for audit logging
      req.auditContext = {
        ipAddress: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
        userAgent: req.get('User-Agent'),
        sessionId: req.session?.id || req.sessionID,
        userId: req.user?.id,
        tenantId: req.user?.tenant_id || req.headers['x-tenant-id'] || 'default',
        requestId: req.id || Date.now().toString(),
        method: req.method,
        url: req.originalUrl || req.url,
        timestamp: new Date()
      };

      // Inject audit service for easy access in controllers/services
      req.auditService = auditService;

      // Helper function to log audit events with request context
      req.logAuditEvent = async (category, action, additionalContext = {}) => {
        try {
          const context = {
            ...req.auditContext,
            ...additionalContext
          };
          
          return await auditService.logEvent(category, action, context);
        } catch (error) {
          logger.error('Failed to log audit event in middleware:', {
            category,
            action,
            error: error.message,
            requestId: req.auditContext.requestId
          });
          // Don't throw - audit logging should not break request processing
          return null;
        }
      };

      next();
    } catch (error) {
      logger.error('Error in audit middleware:', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl || req.url
      });
      // Continue processing even if audit middleware fails
      next();
    }
  };
};

module.exports = auditMiddleware;
