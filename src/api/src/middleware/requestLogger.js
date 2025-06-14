const enhancedLogger = require('../utils/enhanced-logger');
const { v4: uuidv4 } = require('uuid');

// Middleware to log detailed API request information
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  // Add request ID to request object for use in other parts of the application
  req.requestId = requestId;
  
  // Capture request details
  const requestDetails = {
    requestId,
    userId: req.user?.id || null,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    payloadSize: JSON.stringify(req.body || {}).length,
    headers: {
      authorization: req.get('Authorization') ? 'Bearer [REDACTED]' : 'none',
      contentType: req.get('Content-Type') || 'unknown',
      accept: req.get('Accept') || 'unknown'
    },
    query: req.query || {},
    params: req.params || {}
  };

  // Override res.json to capture response details
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Log the API request with detailed context
    enhancedLogger.logAPIRequest(req.method, req.originalUrl, {
      requestId,
      userId: req.user?.id || null,
      status: res.statusCode,
      responseTime,
      payloadSize: requestDetails.payloadSize,
      operation: determineOperation(req),
      dataModified: isDataModifyingOperation(req.method),
      validationErrors: data?.errors || [],
      businessRules: extractBusinessRules(req, data),
      middlewareChain: getMiddlewareChain(req),
      dbQueries: req.dbQueryCount || 0,
      cacheHits: req.cacheHits || 0,
      externalCalls: req.externalCalls || 0,
      ipAddress: requestDetails.ipAddress,
      userAgent: requestDetails.userAgent
    });

    // Call original json method
    return originalJson.call(this, data);
  };

  // Override res.send to capture non-JSON responses
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (res.statusCode >= 400) {
      enhancedLogger.logError(new Error(`HTTP ${res.statusCode} Error`), {
        component: 'API_REQUEST',
        operation: `${req.method} ${req.originalUrl}`,
        userId: req.user?.id || null,
        requestId,
        severity: res.statusCode >= 500 ? 'high' : 'medium',
        parameters: {
          query: req.query,
          params: req.params,
          body: req.body
        }
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

// Helper functions
function determineOperation(req) {
  const path = req.route?.path || req.originalUrl;
  const method = req.method;
  
  if (path.includes('/auth/login')) return 'USER_AUTHENTICATION';
  if (path.includes('/auth/register')) return 'USER_REGISTRATION';
  if (path.includes('/auth/logout')) return 'USER_LOGOUT';
  if (path.includes('/admin/')) return 'ADMIN_OPERATION';
  if (path.includes('/api/users')) return 'USER_MANAGEMENT';
  if (path.includes('/api/sessions')) return 'SESSION_MANAGEMENT';
  if (method === 'GET') return 'DATA_RETRIEVAL';
  if (method === 'POST') return 'DATA_CREATION';
  if (method === 'PUT' || method === 'PATCH') return 'DATA_UPDATE';
  if (method === 'DELETE') return 'DATA_DELETION';
  
  return 'UNKNOWN_OPERATION';
}

function isDataModifyingOperation(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

function extractBusinessRules(req, responseData) {
  const rules = [];
  
  // Extract business rules based on the endpoint and response
  if (req.originalUrl.includes('/auth/')) {
    rules.push('AUTHENTICATION_REQUIRED');
    if (req.user?.admin_level) {
      rules.push('ADMIN_AUTHORIZATION_CHECK');
    }
  }
  
  if (req.originalUrl.includes('/admin/')) {
    rules.push('ADMIN_ONLY_ACCESS');
    rules.push('ELEVATED_PRIVILEGES_REQUIRED');
  }
  
  if (responseData?.errors?.length > 0) {
    rules.push('INPUT_VALIDATION_APPLIED');
  }
  
  return rules;
}

function getMiddlewareChain(req) {
  // This would ideally be populated by other middleware
  const chain = ['REQUEST_LOGGER'];
  
  if (req.user) {
    chain.push('AUTHENTICATION_MIDDLEWARE');
  }
  
  if (req.originalUrl.includes('/admin/')) {
    chain.push('ADMIN_AUTHORIZATION_MIDDLEWARE');
  }
  
  return chain;
}

module.exports = requestLogger;
