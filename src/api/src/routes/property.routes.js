const express = require('express');
const { authMiddleware } = require('../middleware/auth');

module.exports = function(services) {
  const router = express.Router();
  const { PropertyService } = services;

  // Helper function to get tenant ID from user
  const getTenantId = (req) => {
    return req.user?.tenant_id || 'default';
  };

  // Helper function to handle async routes
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  /**
   * GET /api/properties
   * Get all properties with optional filtering
   */
  router.get('/', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const filters = {
        propertyType: req.query.property_type,
        status: req.query.status,
        search: req.query.search
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const properties = await PropertyService.getAllProperties(tenantId, filters);
      
      res.json({
        success: true,
        data: properties,
        count: properties.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }));

  /**
   * GET /api/properties/summary
   * Get properties with checklist and camera summary
   */
  router.get('/summary', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const properties = await PropertyService.getPropertiesWithChecklistSummary(tenantId);
      
      res.json({
        success: true,
        data: properties,
        count: properties.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }));

  /**
   * POST /api/properties
   * Create a new property
   */
  router.post('/', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const propertyData = req.body;

      // Validate required fields
      if (!propertyData.name) {
        return res.status(400).json({
          success: false,
          error: 'Property name is required'
        });
      }

      const property = await PropertyService.createProperty(propertyData, tenantId);
      
      res.status(201).json({
        success: true,
        data: property,
        message: 'Property created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }));

  /**
   * GET /api/properties/:id
   * Get property by ID
   */
  router.get('/:id', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const propertyId = parseInt(req.params.id);

      if (isNaN(propertyId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid property ID'
        });
      }

      const property = await PropertyService.getPropertyById(propertyId, tenantId);
      
      res.json({
        success: true,
        data: property
      });
    } catch (error) {
      const statusCode = error.message === 'Property not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }));

  /**
   * PUT /api/properties/:id
   * Update property
   */
  router.put('/:id', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const propertyId = parseInt(req.params.id);
      const propertyData = req.body;

      if (isNaN(propertyId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid property ID'
        });
      }

      const property = await PropertyService.updateProperty(propertyId, propertyData, tenantId);
      
      res.json({
        success: true,
        data: property,
        message: 'Property updated successfully'
      });
    } catch (error) {
      const statusCode = error.message === 'Property not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }));

  /**
   * DELETE /api/properties/:id
   * Delete property
   */
  router.delete('/:id', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const propertyId = parseInt(req.params.id);

      if (isNaN(propertyId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid property ID'
        });
      }

      await PropertyService.deleteProperty(propertyId, tenantId);
      
      res.json({
        success: true,
        message: 'Property deleted successfully'
      });
    } catch (error) {
      let statusCode = 400;
      let errorMessage = error.message;
      
      if (error.message === 'Property not found') {
        statusCode = 404;
      } else if (error.message.includes('Cannot delete property:')) {
        statusCode = 409; // Conflict status code for constraint violations
        // Pass through the detailed error message from the service
        errorMessage = error.message;
      } else if (error.message.includes('Failed to delete property:')) {
        // Extract the actual error message from the wrapper
        const match = error.message.match(/Failed to delete property: (.+)/);
        if (match) {
          errorMessage = match[1];
          // If the extracted message is about dependencies, use 409 status
          if (errorMessage.includes('Cannot delete property:')) {
            statusCode = 409;
          }
        }
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }));

  /**
   * GET /api/properties/:id/stats
   * Get property statistics
   */
  router.get('/:id/stats', asyncHandler(async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const propertyId = parseInt(req.params.id);

      if (isNaN(propertyId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid property ID'
        });
      }

      const stats = await PropertyService.getPropertyStats(propertyId, tenantId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      const statusCode = error.message === 'Property not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }));

  return router;
};
