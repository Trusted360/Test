const express = require('express');
const logger = require('../utils/logger');

module.exports = function(services) {
  const router = express.Router();
  const { VideoAnalysisService } = services;

  // Helper function to get tenant ID from user
  const getTenantId = (req) => {
    return req.user?.tenant_id || 'default';
  };

  // Helper function to handle async routes
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // Camera Management Routes

  // GET /api/video/cameras - List cameras with optional property filtering
  router.get('/cameras', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { property_id } = req.query;

      const cameras = await VideoAnalysisService.getCameras(
        tenantId, 
        property_id ? parseInt(property_id) : null
      );

      res.json({
        success: true,
        data: cameras,
        count: cameras.length
      });
    } catch (error) {
      logger.error('Error fetching cameras:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cameras',
        message: error.message
      });
    }
  }));

  // GET /api/video/cameras/:id - Get specific camera
  router.get('/cameras/:id', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;

      const camera = await VideoAnalysisService.getCameraById(parseInt(id), tenantId);

      res.json({
        success: true,
        data: camera
      });
    } catch (error) {
      logger.error('Error fetching camera:', error);
      const statusCode = error.message === 'Camera not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to fetch camera',
        message: error.message
      });
    }
  }));

  // POST /api/video/cameras - Create new camera
  router.post('/cameras', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);

      // Validate required fields
      const { property_id, name, rtsp_url } = req.body;
      if (!property_id || !name || !rtsp_url) {
        return res.status(400).json({
          success: false,
          error: 'Property ID, name, and RTSP URL are required'
        });
      }

      const camera = await VideoAnalysisService.createCamera(req.body, tenantId);

      res.status(201).json({
        success: true,
        data: camera,
        message: 'Camera created successfully'
      });
    } catch (error) {
      logger.error('Error creating camera:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to create camera',
        message: error.message
      });
    }
  }));

  // PUT /api/video/cameras/:id - Update camera
  router.put('/cameras/:id', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;

      const camera = await VideoAnalysisService.updateCamera(parseInt(id), req.body, tenantId);

      res.json({
        success: true,
        data: camera,
        message: 'Camera updated successfully'
      });
    } catch (error) {
      logger.error('Error updating camera:', error);
      const statusCode = error.message === 'Camera not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to update camera',
        message: error.message
      });
    }
  }));

  // DELETE /api/video/cameras/:id - Delete camera
  router.delete('/cameras/:id', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;

      const result = await VideoAnalysisService.deleteCamera(parseInt(id), tenantId);

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      logger.error('Error deleting camera:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('existing alerts') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to delete camera',
        message: error.message
      });
    }
  }));

  // Alert Management Routes

  // GET /api/video/alerts - List alerts with filtering
  router.get('/alerts', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { status, property_id, camera_id, severity_level, alert_type_id } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (property_id) filters.property_id = parseInt(property_id);
      if (camera_id) filters.camera_id = parseInt(camera_id);
      if (severity_level) filters.severity_level = severity_level;
      if (alert_type_id) filters.alert_type_id = parseInt(alert_type_id);

      const alerts = await VideoAnalysisService.getAlerts(tenantId, filters);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      logger.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts',
        message: error.message
      });
    }
  }));

  // GET /api/video/alerts/:id - Get specific alert
  router.get('/alerts/:id', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;

      const alert = await VideoAnalysisService.getAlertById(parseInt(id), tenantId);

      res.json({
        success: true,
        data: alert
      });
    } catch (error) {
      logger.error('Error fetching alert:', error);
      const statusCode = error.message === 'Alert not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to fetch alert',
        message: error.message
      });
    }
  }));

  // POST /api/video/alerts - Create new alert (for demo/testing)
  router.post('/alerts', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);

      // Validate required fields
      const { camera_id, alert_type_id } = req.body;
      if (!camera_id || !alert_type_id) {
        return res.status(400).json({
          success: false,
          error: 'Camera ID and alert type ID are required'
        });
      }

      const alert = await VideoAnalysisService.createAlert(req.body, tenantId);

      res.status(201).json({
        success: true,
        data: alert,
        message: 'Alert created successfully'
      });
    } catch (error) {
      logger.error('Error creating alert:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to create alert',
        message: error.message
      });
    }
  }));

  // PUT /api/video/alerts/:id/resolve - Resolve alert
  router.put('/alerts/:id/resolve', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const userId = req.user?.id;
      const { id } = req.params;
      const { notes } = req.body;

      const alert = await VideoAnalysisService.resolveAlert(
        parseInt(id), 
        userId, 
        notes, 
        tenantId
      );

      res.json({
        success: true,
        data: alert,
        message: 'Alert resolved successfully'
      });
    } catch (error) {
      logger.error('Error resolving alert:', error);
      const statusCode = error.message === 'Alert not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to resolve alert',
        message: error.message
      });
    }
  }));

  // Alert Types Management Routes

  // GET /api/video/alert-types - List alert types
  router.get('/alert-types', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);

      const alertTypes = await VideoAnalysisService.getAlertTypes(tenantId);

      res.json({
        success: true,
        data: alertTypes,
        count: alertTypes.length
      });
    } catch (error) {
      logger.error('Error fetching alert types:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alert types',
        message: error.message
      });
    }
  }));

  // POST /api/video/alert-types - Create new alert type
  router.post('/alert-types', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);

      // Validate required fields
      const { name, severity_level } = req.body;
      if (!name || !severity_level) {
        return res.status(400).json({
          success: false,
          error: 'Name and severity level are required'
        });
      }

      const alertType = await VideoAnalysisService.createAlertType(req.body, tenantId);

      res.status(201).json({
        success: true,
        data: alertType,
        message: 'Alert type created successfully'
      });
    } catch (error) {
      logger.error('Error creating alert type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create alert type',
        message: error.message
      });
    }
  }));

  // Service Ticket Management Routes

  // GET /api/video/service-tickets - List service tickets
  router.get('/service-tickets', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { status, priority, assigned_to } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (assigned_to) filters.assigned_to = parseInt(assigned_to);

      const tickets = await VideoAnalysisService.getServiceTickets(tenantId, filters);

      res.json({
        success: true,
        data: tickets,
        count: tickets.length
      });
    } catch (error) {
      logger.error('Error fetching service tickets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service tickets',
        message: error.message
      });
    }
  }));

  // POST /api/video/service-tickets - Create new service ticket
  router.post('/service-tickets', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);

      // Validate required fields
      const { title, description } = req.body;
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: 'Title and description are required'
        });
      }

      const ticket = await VideoAnalysisService.createServiceTicket(req.body, tenantId);

      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Service ticket created successfully'
      });
    } catch (error) {
      logger.error('Error creating service ticket:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to create service ticket',
        message: error.message
      });
    }
  }));

  // Statistics and Analytics Routes

  // GET /api/video/stats - Get alert statistics
  router.get('/stats', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { property_id } = req.query;

      const stats = await VideoAnalysisService.getAlertStats(
        tenantId, 
        property_id ? parseInt(property_id) : null
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching alert stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alert statistics',
        message: error.message
      });
    }
  }));

  // Property-specific Routes

  // GET /api/video/property/:propertyId/cameras - Get cameras for specific property
  router.get('/property/:propertyId/cameras', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { propertyId } = req.params;

      const cameras = await VideoAnalysisService.getCameras(tenantId, parseInt(propertyId));

      res.json({
        success: true,
        data: cameras,
        count: cameras.length
      });
    } catch (error) {
      logger.error('Error fetching property cameras:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch property cameras',
        message: error.message
      });
    }
  }));

  // GET /api/video/property/:propertyId/alerts - Get alerts for specific property
  router.get('/property/:propertyId/alerts', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { propertyId } = req.params;
      const { status } = req.query;

      const filters = { property_id: parseInt(propertyId) };
      if (status) filters.status = status;

      const alerts = await VideoAnalysisService.getAlerts(tenantId, filters);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      logger.error('Error fetching property alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch property alerts',
        message: error.message
      });
    }
  }));

  // Demo/Testing Routes

  // POST /api/video/demo/generate-alert - Generate demo alert for testing
  router.post('/demo/generate-alert', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { camera_id, alert_type_id } = req.body;

      if (!camera_id || !alert_type_id) {
        return res.status(400).json({
          success: false,
          error: 'Camera ID and alert type ID are required'
        });
      }

      // Generate demo alert with random confidence score
      const demoAlertData = {
        camera_id: parseInt(camera_id),
        alert_type_id: parseInt(alert_type_id),
        confidence_score: Math.random() * 0.4 + 0.6, // 60-100% confidence
        metadata: {
          demo: true,
          generated_at: new Date().toISOString(),
          detection_region: {
            x: Math.floor(Math.random() * 800),
            y: Math.floor(Math.random() * 600),
            width: Math.floor(Math.random() * 200) + 100,
            height: Math.floor(Math.random() * 200) + 100
          }
        }
      };

      const alert = await VideoAnalysisService.createAlert(demoAlertData, tenantId);

      res.status(201).json({
        success: true,
        data: alert,
        message: 'Demo alert generated successfully'
      });
    } catch (error) {
      logger.error('Error generating demo alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate demo alert',
        message: error.message
      });
    }
  }));

  return router;
};
