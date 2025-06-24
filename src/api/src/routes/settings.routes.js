const express = require('express');
const router = express.Router();

module.exports = function(services) {
  // Import settings controller from the correct path
  const settingsController = require('../../controllers/settings.controller');

  // Global Settings routes
  router.get('/global', settingsController.getGlobalSettings);
  router.put('/global', settingsController.updateGlobalSettings);

  // User Settings routes
  router.get('/user', settingsController.getUserSettings);
  router.put('/user', settingsController.updateUserSettings);

  // Notification Targets routes
  router.get('/notification-targets', settingsController.getNotificationTargets);
  router.post('/notification-targets', settingsController.createNotificationTarget);
  router.put('/notification-targets/:id', settingsController.updateNotificationTarget);
  router.delete('/notification-targets/:id', settingsController.deleteNotificationTarget);

  // Service Integrations routes
  router.get('/service-integrations', settingsController.getServiceIntegrations);
  router.post('/service-integrations', settingsController.createServiceIntegration);
  router.put('/service-integrations/:id', settingsController.updateServiceIntegration);
  router.delete('/service-integrations/:id', settingsController.deleteServiceIntegration);

  // Camera Feed Settings routes
  router.get('/camera-feeds', settingsController.getCameraFeedSettings);
  router.put('/camera-feeds/:cameraFeedId', settingsController.updateCameraFeedSettings);

  return router;
};