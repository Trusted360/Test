const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/checklist-attachments');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow common file types for checklist attachments
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: images, PDF, documents, spreadsheets'));
    }
  }
});

module.exports = function(services) {
  const router = express.Router();
  const { ChecklistService, SchedulerService } = services;

  // Template Management Routes

  // GET /api/checklist-templates - List all templates
  router.get('/templates', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { property_type } = req.query;

      const templates = await ChecklistService.getTemplates(tenantId, property_type);

      res.json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error) {
      logger.error('Error fetching checklist templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch checklist templates',
        message: error.message
      });
    }
  });

  // GET /api/checklist-templates/:id - Get specific template with items
  router.get('/templates/:id', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { id } = req.params;

      const template = await ChecklistService.getTemplateById(parseInt(id), tenantId);

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error fetching checklist template:', error);
      const statusCode = error.message === 'Template not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to fetch checklist template',
        message: error.message
      });
    }
  });

  // POST /api/checklist-templates - Create new template
  router.post('/templates', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const userId = req.user?.id;
      
      const templateData = {
        ...req.body,
        created_by: userId
      };

      const template = await ChecklistService.createTemplate(templateData, tenantId);

      res.status(201).json({
        success: true,
        data: template,
        message: 'Checklist template created successfully'
      });
    } catch (error) {
      logger.error('Error creating checklist template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create checklist template',
        message: error.message
      });
    }
  });

  // PUT /api/checklist-templates/:id - Update template
  router.put('/templates/:id', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { id } = req.params;

      const template = await ChecklistService.updateTemplate(parseInt(id), req.body, tenantId);

      res.json({
        success: true,
        data: template,
        message: 'Checklist template updated successfully'
      });
    } catch (error) {
      logger.error('Error updating checklist template:', error);
      const statusCode = error.message === 'Template not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to update checklist template',
        message: error.message
      });
    }
  });

  // DELETE /api/checklist-templates/:id - Delete template (soft delete)
  router.delete('/templates/:id', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { id } = req.params;

      const result = await ChecklistService.deleteTemplate(parseInt(id), tenantId);

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      logger.error('Error deleting checklist template:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('in use') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to delete checklist template',
        message: error.message
      });
    }
  });

  // Checklist Instance Management Routes

  // GET /api/checklists - List checklists with filtering
  router.get('/', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { status, property_id, assigned_to } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (property_id) filters.property_id = parseInt(property_id);
      if (assigned_to) filters.assigned_to = parseInt(assigned_to);

      const checklists = await ChecklistService.getChecklists(tenantId, filters);

      res.json({
        success: true,
        data: checklists,
        count: checklists.length
      });
    } catch (error) {
      logger.error('Error fetching checklists:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch checklists',
        message: error.message
      });
    }
  });

  // GET /api/checklists/my - Get current user's checklists
  router.get('/my', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const userId = req.user?.id;
      const { status } = req.query;

      const checklists = await ChecklistService.getChecklistsByUser(userId, tenantId, status);

      res.json({
        success: true,
        data: checklists,
        count: checklists.length
      });
    } catch (error) {
      logger.error('Error fetching user checklists:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user checklists',
        message: error.message
      });
    }
  });

  // GET /api/checklists/:id - Get specific checklist with items and responses
  router.get('/:id', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { id } = req.params;

      const checklist = await ChecklistService.getChecklistById(parseInt(id), tenantId);

      res.json({
        success: true,
        data: checklist
      });
    } catch (error) {
      logger.error('Error fetching checklist:', error);
      const statusCode = error.message === 'Checklist not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to fetch checklist',
        message: error.message
      });
    }
  });

  // POST /api/checklists - Create new checklist instance
  router.post('/', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';

      const checklist = await ChecklistService.createChecklist(req.body, tenantId);

      res.status(201).json({
        success: true,
        data: checklist,
        message: 'Checklist created successfully'
      });
    } catch (error) {
      logger.error('Error creating checklist:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to create checklist',
        message: error.message
      });
    }
  });

  // PUT /api/checklists/:id - Update checklist
  router.put('/:id', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { id } = req.params;
      const updateData = req.body;

      const checklist = await ChecklistService.updateChecklist(parseInt(id), updateData, tenantId);

      res.json({
        success: true,
        data: checklist,
        message: 'Checklist updated successfully'
      });
    } catch (error) {
      logger.error('Error updating checklist:', error);
      const statusCode = error.message === 'Checklist not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to update checklist',
        message: error.message
      });
    }
  });

  // PUT /api/checklists/:id/status - Update checklist status
  router.put('/:id/status', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }

      const checklist = await ChecklistService.updateChecklistStatus(parseInt(id), status, tenantId);

      res.json({
        success: true,
        data: checklist,
        message: 'Checklist status updated successfully'
      });
    } catch (error) {
      logger.error('Error updating checklist status:', error);
      const statusCode = error.message === 'Checklist not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to update checklist status',
        message: error.message
      });
    }
  });

  // DELETE /api/checklists/:id - Delete checklist
  router.delete('/:id', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { id } = req.params;

      const result = await ChecklistService.deleteChecklist(parseInt(id), tenantId);

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      logger.error('Error deleting checklist:', error);
      const statusCode = error.message === 'Checklist not found' ? 404 : 
                        error.message.includes('Cannot delete') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to delete checklist',
        message: error.message
      });
    }
  });

  // Item Completion Routes

  // POST /api/checklists/:id/items/:itemId/complete - Complete checklist item
  router.post('/:id/items/:itemId/complete', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const userId = req.user?.id;
      const { id, itemId } = req.params;

      const response = await ChecklistService.completeItem(
        parseInt(id),
        parseInt(itemId),
        req.body,
        userId,
        tenantId
      );

      res.json({
        success: true,
        data: response,
        message: 'Checklist item completed successfully'
      });
    } catch (error) {
      logger.error('Error completing checklist item:', error);
      const statusCode = error.message === 'Checklist not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to complete checklist item',
        message: error.message
      });
    }
  });

  // DELETE /api/checklists/:id/items/:itemId/complete - Uncomplete checklist item
  router.delete('/:id/items/:itemId/complete', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const userId = req.user?.id;
      const { id, itemId } = req.params;

      const result = await ChecklistService.uncompleteItem(
        parseInt(id),
        parseInt(itemId),
        userId,
        tenantId
      );

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      logger.error('Error uncompleting checklist item:', error);
      const statusCode = error.message === 'Checklist not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to uncomplete checklist item',
        message: error.message
      });
    }
  });

  // Comment Routes

  // GET /api/checklists/:id/items/:itemId/comments - Get comments for an item
  router.get('/:id/items/:itemId/comments', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { id, itemId } = req.params;

      const comments = await ChecklistService.getComments(
        parseInt(id),
        parseInt(itemId),
        tenantId
      );

      res.json({
        success: true,
        data: comments,
        count: comments.length
      });
    } catch (error) {
      logger.error('Error fetching comments:', error);
      const statusCode = error.message === 'Checklist not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to fetch comments',
        message: error.message
      });
    }
  });

  // POST /api/checklists/:id/items/:itemId/comments - Add comment to an item
  router.post('/:id/items/:itemId/comments', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const userId = req.user?.id;
      const { id, itemId } = req.params;

      const comment = await ChecklistService.addComment(
        parseInt(id),
        parseInt(itemId),
        req.body,
        userId,
        tenantId
      );

      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment added successfully'
      });
    } catch (error) {
      logger.error('Error adding comment:', error);
      const statusCode = error.message === 'Checklist not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to add comment',
        message: error.message
      });
    }
  });

  // DELETE /api/checklists/comments/:commentId - Delete a comment
  router.delete('/comments/:commentId', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const userId = req.user?.id;
      const { commentId } = req.params;

      const result = await ChecklistService.deleteComment(
        parseInt(commentId),
        userId,
        tenantId
      );

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      logger.error('Error deleting comment:', error);
      const statusCode = error.message === 'Comment not found' ? 404 : 
                        error.message.includes('Unauthorized') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to delete comment',
        message: error.message
      });
    }
  });

  // POST /api/checklists/:id/attachments - Upload file attachment
  router.post('/:id/attachments', upload.single('file'), async (req, res) => {
    try {
      const userId = req.user?.id;
      const { response_id } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      if (!response_id) {
        return res.status(400).json({
          success: false,
          error: 'Response ID is required'
        });
      }

      const fileData = {
        file_name: req.file.originalname,
        file_path: req.file.path,
        file_type: req.file.mimetype,
        file_size: req.file.size
      };

      const attachment = await ChecklistService.uploadAttachment(
        parseInt(response_id),
        fileData,
        userId
      );

      res.json({
        success: true,
        data: attachment,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      logger.error('Error uploading attachment:', error);
      
      // Clean up uploaded file if there was an error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.error('Error cleaning up uploaded file:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        error: 'Failed to upload attachment',
        message: error.message
      });
    }
  });

  // GET /api/checklists/attachments/:attachmentId/download - Download attachment
  router.get('/attachments/:attachmentId/download', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { attachmentId } = req.params;

      const attachment = await ChecklistService.getAttachment(
        parseInt(attachmentId),
        tenantId
      );

      if (!attachment) {
        return res.status(404).json({
          success: false,
          error: 'Attachment not found'
        });
      }

      // Check if file exists
      try {
        await fs.access(attachment.file_path);
      } catch (err) {
        logger.error('Attachment file not found on disk:', attachment.file_path);
        return res.status(404).json({
          success: false,
          error: 'Attachment file not found'
        });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', attachment.file_type);
      
      // For PDFs and images, use inline disposition so they open in browser
      // For other files, use attachment to force download
      const inlineTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const disposition = inlineTypes.includes(attachment.file_type) ? 'inline' : 'attachment';
      
      res.setHeader('Content-Disposition', `${disposition}; filename="${attachment.file_name}"`);
      res.setHeader('Content-Length', attachment.file_size);

      // Stream the file
      const fileStream = require('fs').createReadStream(attachment.file_path);
      fileStream.pipe(res);
    } catch (error) {
      logger.error('Error downloading attachment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download attachment',
        message: error.message
      });
    }
  });

  // Approval Workflow Routes

  // GET /api/checklists/approvals/queue - Get approval queue
  router.get('/approvals/queue', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const userId = req.user?.id;
      const { approver_id } = req.query;

      // If approver_id is provided, use it; otherwise use current user
      const approverId = approver_id ? parseInt(approver_id) : userId;

      const approvalQueue = await ChecklistService.getApprovalQueue(tenantId, approverId);

      res.json({
        success: true,
        data: approvalQueue,
        count: approvalQueue.length
      });
    } catch (error) {
      logger.error('Error fetching approval queue:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch approval queue',
        message: error.message
      });
    }
  });

  // POST /api/checklists/approvals/:responseId/approve - Approve response
  router.post('/approvals/:responseId/approve', async (req, res) => {
    try {
      const userId = req.user?.id;
      const { responseId } = req.params;
      const { notes } = req.body;

      const result = await ChecklistService.approveResponse(
        parseInt(responseId),
        userId,
        notes
      );

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      logger.error('Error approving response:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve response',
        message: error.message
      });
    }
  });

  // POST /api/checklists/approvals/:responseId/reject - Reject response
  router.post('/approvals/:responseId/reject', async (req, res) => {
    try {
      const userId = req.user?.id;
      const { responseId } = req.params;
      const { notes } = req.body;

      if (!notes) {
        return res.status(400).json({
          success: false,
          error: 'Rejection notes are required'
        });
      }

      const result = await ChecklistService.rejectResponse(
        parseInt(responseId),
        userId,
        notes
      );

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      logger.error('Error rejecting response:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject response',
        message: error.message
      });
    }
  });

  // Property-specific Routes

  // GET /api/checklists/property/:propertyId - Get checklists for specific property
  router.get('/property/:propertyId', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      const { propertyId } = req.params;

      const checklists = await ChecklistService.getChecklistsByProperty(
        parseInt(propertyId),
        tenantId
      );

      res.json({
        success: true,
        data: checklists,
        count: checklists.length
      });
    } catch (error) {
      logger.error('Error fetching property checklists:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch property checklists',
        message: error.message
      });
    }
  });

  // Scheduling Routes

  // GET /api/checklists/scheduled/templates - Get all scheduled templates
  router.get('/scheduled/templates', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 'default';

      const templates = await ChecklistService.getScheduledTemplates(tenantId);

      res.json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error) {
      logger.error('Error fetching scheduled templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch scheduled templates',
        message: error.message
      });
    }
  });

  // POST /api/checklists/scheduled/generate - Manually trigger scheduled checklist generation
  router.post('/scheduled/generate', async (req, res) => {
    try {
      const { date } = req.body;
      const targetDate = date ? new Date(date) : new Date();

      const result = await ChecklistService.generateScheduledChecklists(targetDate);

      res.json({
        success: true,
        data: result,
        message: `Generated ${result.generatedCount} checklists for ${result.date}`
      });
    } catch (error) {
      logger.error('Error generating scheduled checklists:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate scheduled checklists',
        message: error.message
      });
    }
  });

  // GET /api/checklists/scheduled/history/:templateId - Get generation history for a template
  router.get('/scheduled/history/:templateId', async (req, res) => {
    try {
      const { templateId } = req.params;
      const { limit = 100 } = req.query;

      const history = await ChecklistService.getScheduleGenerationHistory(
        parseInt(templateId),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error) {
      logger.error('Error fetching schedule generation history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch schedule generation history',
        message: error.message
      });
    }
  });

  // Scheduler Management Routes

  // GET /api/checklists/scheduler/status - Get scheduler status
  router.get('/scheduler/status', async (req, res) => {
    try {
      const status = await SchedulerService.getStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Error fetching scheduler status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch scheduler status',
        message: error.message
      });
    }
  });

  // POST /api/checklists/scheduler/trigger - Manually trigger scheduler
  router.post('/scheduler/trigger', async (req, res) => {
    try {
      const result = await SchedulerService.triggerGeneration();

      res.json({
        success: true,
        data: result,
        message: `Generated ${result.generatedCount} checklists`
      });
    } catch (error) {
      logger.error('Error triggering scheduler:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger scheduler',
        message: error.message
      });
    }
  });

  // Error handling middleware for multer
  router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large',
          message: 'File size must be less than 10MB'
        });
      }
    }
    
    if (error.message && error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: error.message
      });
    }

    next(error);
  });

  return router;
};
