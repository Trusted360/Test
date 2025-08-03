/**
 * Simple SOP Routes - mirrors checklist pattern exactly
 * Property-specific endpoints that work like checklists
 */

const express = require('express');
const logger = require('../utils/logger');

module.exports = function(services) {
  const router = express.Router();
  const { sopService } = services;

  // Authentication is handled by parent router in routes/index.js

  // ===== SOP Templates (like checklist templates) =====

  /**
   * @route GET /api/sops/templates
   * @desc Get all SOP templates
   * @access Authenticated
   */
  router.get('/templates', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const filters = {
        search: req.query.search,
        category: req.query.category
      };

      const templates = await sopService.getSOPTemplates(tenantId, filters);

      res.json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error) {
      logger.error('Error fetching SOP templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch SOP templates',
        error: error.message
      });
    }
  });

  /**
   * @route GET /api/sops/templates/:id
   * @desc Get SOP template by ID with items
   * @access Authenticated
   */
  router.get('/templates/:id', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const template = await sopService.getSOPTemplateById(req.params.id, tenantId);

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error fetching SOP template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch SOP template',
        error: error.message
      });
    }
  });

  /**
   * @route POST /api/sops/templates
   * @desc Create new SOP template
   * @access Authenticated
   */
  router.post('/templates', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const userId = req.user?.id;
      
      const template = await sopService.createSOPTemplate(req.body, tenantId, userId);

      res.status(201).json({
        success: true,
        data: template,
        message: 'SOP template created successfully'
      });
    } catch (error) {
      logger.error('Error creating SOP template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create SOP template',
        error: error.message
      });
    }
  });

  /**
   * @route PUT /api/sops/templates/:id
   * @desc Update SOP template
   * @access Authenticated
   */
  router.put('/templates/:id', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      
      const template = await sopService.updateSOPTemplate(req.params.id, req.body, tenantId);

      res.json({
        success: true,
        data: template,
        message: 'SOP template updated successfully'
      });
    } catch (error) {
      logger.error('Error updating SOP template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update SOP template',
        error: error.message
      });
    }
  });

  /**
   * @route DELETE /api/sops/templates/:id
   * @desc Delete SOP template
   * @access Authenticated
   */
  router.delete('/templates/:id', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      
      await sopService.deleteSOPTemplate(req.params.id, tenantId);

      res.json({
        success: true,
        message: 'SOP template deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting SOP template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete SOP template',
        error: error.message
      });
    }
  });

  // ===== Property SOPs (like property checklists) =====

  /**
   * @route GET /api/sops/properties/:propertyId
   * @desc Get SOPs for a specific property
   * @access Authenticated
   */
  router.get('/properties/:propertyId', async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        assigned_to: req.query.assigned_to
      };

      const sops = await sopService.getPropertySOPs(req.params.propertyId, filters);

      res.json({
        success: true,
        data: sops,
        count: sops.length
      });
    } catch (error) {
      logger.error('Error fetching property SOPs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch property SOPs',
        error: error.message
      });
    }
  });

  /**
   * @route POST /api/sops/properties/:propertyId
   * @desc Assign SOP template to property
   * @access Authenticated
   */
  router.post('/properties/:propertyId', async (req, res) => {
    try {
      const { template_id, assigned_to, due_date } = req.body;
      
      const propertySOP = await sopService.createPropertySOP(
        req.params.propertyId,
        template_id,
        assigned_to,
        due_date
      );

      res.status(201).json({
        success: true,
        data: propertySOP,
        message: 'SOP assigned to property successfully'
      });
    } catch (error) {
      logger.error('Error assigning SOP to property:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign SOP to property',
        error: error.message
      });
    }
  });

  /**
   * @route GET /api/sops/:id
   * @desc Get property SOP by ID with responses
   * @access Authenticated
   */
  router.get('/:id', async (req, res) => {
    try {
      const propertySOP = await sopService.getPropertySOPById(req.params.id);

      res.json({
        success: true,
        data: propertySOP
      });
    } catch (error) {
      logger.error('Error fetching property SOP:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch property SOP',
        error: error.message
      });
    }
  });

  /**
   * @route PUT /api/sops/:id
   * @desc Update property SOP
   * @access Authenticated
   */
  router.put('/:id', async (req, res) => {
    try {
      const propertySOP = await sopService.updatePropertySOP(req.params.id, req.body);

      res.json({
        success: true,
        data: propertySOP,
        message: 'Property SOP updated successfully'
      });
    } catch (error) {
      logger.error('Error updating property SOP:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update property SOP',
        error: error.message
      });
    }
  });

  // ===== Compatibility routes for existing frontend =====

  /**
   * @route GET /api/sops
   * @desc Get all SOP templates (compatibility route)
   * @access Authenticated
   */
  router.get('/', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const filters = {
        search: req.query.search,
        category: req.query.category
      };

      const sops = await sopService.getSops(tenantId, filters);

      res.json({
        success: true,
        data: sops,
        count: sops.length
      });
    } catch (error) {
      logger.error('Error fetching SOPs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch SOPs',
        error: error.message
      });
    }
  });

  /**
   * @route POST /api/sops
   * @desc Create new SOP (compatibility route)
   * @access Authenticated
   */
  router.post('/', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const userId = req.user?.id;
      
      const sop = await sopService.createSop(req.body, tenantId, userId);

      res.status(201).json({
        success: true,
        data: sop,
        message: 'SOP created successfully'
      });
    } catch (error) {
      logger.error('Error creating SOP:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create SOP',
        error: error.message
      });
    }
  });

  return router;
};