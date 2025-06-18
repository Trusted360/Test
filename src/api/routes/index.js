const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../src/middleware/auth');

// Import controllers
const facilitiesController = require('../controllers/facilities.controller');
const unitsController = require('../controllers/units.controller');
const camerasController = require('../controllers/cameras.controller');
const maintenanceController = require('../controllers/maintenance.controller');
const analyticsController = require('../controllers/analytics.controller');
const videoController = require('../controllers/video.controller');

// Import routes
const checklistRoutes = require('./checklist.routes');

// Authentication routes (keep from Simmer)
router.use('/auth', require('./auth.routes'));

// Protected routes
router.use(authenticateJWT);

// Facility routes (replaces recipe routes)
router.get('/facilities', facilitiesController.index);
router.post('/facilities', facilitiesController.create);
router.get('/facilities/:id', facilitiesController.show);
router.put('/facilities/:id', facilitiesController.update);
router.delete('/facilities/:id', facilitiesController.destroy);

// Unit routes (new for Trusted360)
router.get('/units', unitsController.index);
router.get('/units/:id', unitsController.show);
router.post('/facilities/:facilityId/units', unitsController.create);
router.put('/units/:id', unitsController.update);
router.delete('/units/:id', unitsController.destroy);
router.get('/units/:id/events', unitsController.getEvents);

// Camera routes (replaces image management)
router.get('/facilities/:facilityId/cameras', camerasController.index);
router.post('/facilities/:facilityId/cameras', camerasController.create);
router.get('/cameras/:id', camerasController.show);
router.put('/cameras/:id', camerasController.update);
router.delete('/cameras/:id', camerasController.destroy);
router.get('/cameras/:id/stream', camerasController.getStream);

// Maintenance routes (new for Trusted360)
router.get('/maintenance', maintenanceController.index);
router.post('/maintenance', maintenanceController.create);
router.get('/maintenance/:id', maintenanceController.show);
router.put('/maintenance/:id', maintenanceController.update);
router.post('/maintenance/:id/comments', maintenanceController.addComment);

// Analytics routes (new for Trusted360)
router.get('/analytics/dashboard', analyticsController.dashboard);
router.get('/analytics/occupancy', analyticsController.occupancy);
router.get('/analytics/revenue', analyticsController.revenue);
router.get('/analytics/maintenance', analyticsController.maintenance);

// Video routes
router.get('/video/cameras', videoController.getCameras);
router.get('/video/cameras/:id', videoController.getCameraById);
router.post('/video/cameras', videoController.createCamera);
router.put('/video/cameras/:id', videoController.updateCamera);
router.delete('/video/cameras/:id', videoController.deleteCamera);

router.get('/video/alerts', videoController.getAlerts);
router.get('/video/alerts/:id', videoController.getAlertById);
router.post('/video/alerts', videoController.createAlert);
router.put('/video/alerts/:id/resolve', videoController.resolveAlert);

router.get('/video/alert-types', videoController.getAlertTypes);
router.post('/video/alert-types', videoController.createAlertType);

router.get('/video/service-tickets', videoController.getServiceTickets);
router.post('/video/service-tickets', videoController.createServiceTicket);

router.get('/video/stats', videoController.getStats);

router.get('/video/property/:propertyId/cameras', videoController.getCamerasForProperty);
router.get('/video/property/:propertyId/alerts', videoController.getAlertsForProperty);
router.get('/video/property/:propertyId/config', videoController.getPropertyVideoConfig);
router.post('/video/property/:propertyId/demo-alert', videoController.generateDemoAlertForProperty);

router.get('/video/alerts-with-checklists', videoController.getAlertsWithChecklists);

router.post('/video/demo/generate-alert', videoController.generateDemoAlert);

// Legacy video processing webhook
router.post('/video/events', videoController.processEvent);

// Checklist routes
router.use('/checklists', checklistRoutes);

module.exports = router;
