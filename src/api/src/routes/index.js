const express = require('express');

// Import route modules
const authRoutesFn = require('./auth.routes'); // Renamed to indicate it's a function
const ollamaRoutes = require('./ollama.routes');
const notificationsRoutes = require('./notifications.routes');
const tagRoutes = require('./tag.routes');
const adminRoutes = require('./admin');
const propertyRoutes = require('./property.routes');
const checklistRoutes = require('./checklist.routes');
const videoRoutes = require('./video.routes');
const chatRoutes = require('./chat.routes');
const auditRoutes = require('./audit.routes');
const settingsRoutes = require('./settings.routes');
const propertyManagerRoutes = require('./propertyManager.routes');

// Import middleware
const { authenticateJWT, authMiddleware } = require('../middleware/auth');

module.exports = function(services) { // Function that accepts services
  const router = express.Router();
  const authRoutes = authRoutesFn(services);

  // Register routes
  router.use('/auth', authRoutes);
  router.use('/ollama', ollamaRoutes);
  router.use('/notifications', notificationsRoutes);
  router.use('/tags', tagRoutes);
  
  // Property routes (protected by session-aware auth middleware)
  router.use('/properties', authMiddleware(services.sessionModel, services.userModel), propertyRoutes(services));
  
  // Checklist routes (protected by session-aware auth middleware)
  router.use('/checklists', authMiddleware(services.sessionModel, services.userModel), checklistRoutes(services));
  
  // Video analysis routes (protected by session-aware auth middleware)
  router.use('/video', authMiddleware(services.sessionModel, services.userModel), videoRoutes(services));
  
  // Chat routes (protected by session-aware auth middleware)
  router.use('/chat', authMiddleware(services.sessionModel, services.userModel), chatRoutes(services));
  
  // Admin routes (protected by session-aware auth middleware)
  router.use('/admin', authMiddleware(services.sessionModel, services.userModel), adminRoutes);
  
  // Audit routes (protected by session-aware auth middleware)
  router.use('/audit', authMiddleware(services.sessionModel, services.userModel), auditRoutes(services));
  
  // Settings routes (protected by session-aware auth middleware)
  router.use('/settings', authMiddleware(services.sessionModel, services.userModel), settingsRoutes(services));
  
  // Property Manager routes (protected by session-aware auth middleware)
  router.use('/property-manager', authMiddleware(services.sessionModel, services.userModel), propertyManagerRoutes(services));

  // API version and status
  router.get('/', (req, res) => {
    res.json({
      name: 'Trusted 360 API',
      version: '0.1.0',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // Test route without authentication
  router.get('/test', (req, res) => {
    res.json({
      test: 'ok',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  });

  return router;
}; // Close the function
