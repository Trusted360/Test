const express = require('express');

// Import route modules
const authRoutesFn = require('./auth.routes'); // Renamed to indicate it's a function
const ollamaRoutes = require('./ollama.routes');
const notificationsRoutes = require('./notifications.routes');
const tagRoutes = require('./tag.routes');

module.exports = function(services) { // Function that accepts services
  const router = express.Router();
  const authRoutes = authRoutesFn(services);

  // Register routes
  router.use('/auth', authRoutes);
  router.use('/ollama', ollamaRoutes);
  router.use('/notifications', notificationsRoutes);
  router.use('/tags', tagRoutes);

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
