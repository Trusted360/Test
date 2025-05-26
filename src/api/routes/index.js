const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Import controllers
const facilitiesController = require('../controllers/facilities.controller');
const unitsController = require('../controllers/units.controller');
const camerasController = require('../controllers/cameras.controller');
const maintenanceController = require('../controllers/maintenance.controller');
const analyticsController = require('../controllers/analytics.controller');

// Authentication routes (keep from Simmer)
router.use('/auth', require('./auth.routes'));

// Protected routes
router.use(authenticate);

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

// Video processing webhook
router.post('/video/events', require('../controllers/video.controller').processEvent);

module.exports = router; 