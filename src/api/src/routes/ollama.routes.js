const express = require('express');
const router = express.Router();
const ollamaService = require('../services/ollama.service');
const { authenticateJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route POST /api/ollama/generate-audit-checklist
 * @description Generate an audit checklist using Ollama
 * @access Private
 */
router.post('/generate-audit-checklist', authenticateJWT, async (req, res, next) => {
  try {
    const { facilityType, requirements, customItems } = req.body;
    
    if (!facilityType) {
      return res.status(400).json({ 
        error: 'Facility type is required' 
      });
    }

    const checklist = await ollamaService.generateAuditChecklist(facilityType, requirements, customItems);
    res.json(checklist);
  } catch (error) {
    logger.error('Error generating audit checklist:', error);
    next(error);
  }
});

/**
 * @route POST /api/ollama/analyze-incident
 * @description Analyze a security incident using Ollama
 * @access Private
 */
router.post('/analyze-incident', authenticateJWT, async (req, res, next) => {
  try {
    const { incidentType, description, images, context } = req.body;
    
    if (!incidentType || !description) {
      return res.status(400).json({ 
        error: 'Incident type and description are required' 
      });
    }

    const analysis = await ollamaService.analyzeIncident(incidentType, description, images, context);
    res.json(analysis);
  } catch (error) {
    logger.error('Error analyzing incident:', error);
    next(error);
  }
});

/**
 * @route POST /api/ollama/generate-report
 * @description Generate a security report using Ollama
 * @access Private
 */
router.post('/generate-report', authenticateJWT, async (req, res, next) => {
  try {
    const { reportType, data, timeframe } = req.body;
    
    if (!reportType || !data) {
      return res.status(400).json({ 
        error: 'Report type and data are required' 
      });
    }

    const report = await ollamaService.generateReport(reportType, data, timeframe);
    res.json(report);
  } catch (error) {
    logger.error('Error generating report:', error);
    next(error);
  }
});

/**
 * @route GET /api/ollama/health
 * @description Check Ollama service health
 * @access Private
 */
router.get('/health', authenticateJWT, async (req, res, next) => {
  try {
    const health = await ollamaService.checkHealth();
    res.json(health);
  } catch (error) {
    logger.error('Error checking Ollama health:', error);
    next(error);
  }
});

module.exports = router;
