const express = require('express');
const logger = require('../utils/logger');

/**
 * Chat Routes - Enhanced conversation management with knowledge base integration
 * Builds on existing OllamaService for LLM interactions
 * Note: Authentication middleware is applied at the router level in routes/index.js
 */
module.exports = function(services) {
  const router = express.Router();
  const { ChatService } = services;

  /**
   * @route GET /api/chat/conversations
   * @description Get user's conversations
   * @access Private
   */
  router.get('/conversations', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { property_id, status } = req.query;

      const conversations = await ChatService.getConversations(
        userId, 
        tenantId, 
        property_id ? parseInt(property_id) : null,
        status
      );

      res.json({
        success: true,
        data: conversations,
        count: conversations.length
      });
    } catch (error) {
      logger.error('Error getting conversations:', error);
      next(error);
    }
  });

  /**
   * @route POST /api/chat/conversations
   * @description Create a new conversation
   * @access Private
   */
  router.post('/conversations', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { property_id, title } = req.body;

      const conversation = await ChatService.createConversation(
        userId,
        property_id ? parseInt(property_id) : null,
        title,
        tenantId
      );

      res.status(201).json({
        success: true,
        data: conversation
      });
    } catch (error) {
      logger.error('Error creating conversation:', error);
      next(error);
    }
  });

  /**
   * @route GET /api/chat/conversations/:id
   * @description Get conversation details
   * @access Private
   */
  router.get('/conversations/:id', async (req, res, next) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const conversation = await ChatService.getConversationById(
        conversationId,
        userId,
        tenantId
      );

      res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      logger.error('Error getting conversation:', error);
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or access denied'
        });
      }
      next(error);
    }
  });

  /**
   * @route GET /api/chat/conversations/:id/messages
   * @description Get conversation message history
   * @access Private
   */
  router.get('/conversations/:id/messages', async (req, res, next) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { limit = 50, offset = 0 } = req.query;

      const messages = await ChatService.getConversationHistory(
        conversationId,
        userId,
        tenantId,
        parseInt(limit),
        parseInt(offset)
      );

      res.json({
        success: true,
        data: messages,
        count: messages.length,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      logger.error('Error getting conversation history:', error);
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or access denied'
        });
      }
      next(error);
    }
  });

  /**
   * @route POST /api/chat/conversations/:id/messages
   * @description Send a message and get AI response
   * @access Private
   */
  router.post('/conversations/:id/messages', async (req, res, next) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { message_text } = req.body;

      if (!message_text || typeof message_text !== 'string' || message_text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message text is required'
        });
      }

      if (message_text.length > 4000) {
        return res.status(400).json({
          success: false,
          error: 'Message too long (maximum 4000 characters)'
        });
      }

      const result = await ChatService.sendMessage(
        conversationId,
        message_text.trim(),
        userId,
        tenantId
      );

      res.json({
        success: true,
        data: {
          user_message: result.userMessage,
          ai_message: result.aiMessage,
          context_summary: result.context
        }
      });
    } catch (error) {
      logger.error('Error sending message:', error);
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or access denied'
        });
      }
      if (error.message.includes('Failed to generate AI response')) {
        return res.status(503).json({
          success: false,
          error: 'AI service temporarily unavailable. Please try again.'
        });
      }
      next(error);
    }
  });

  /**
   * @route PUT /api/chat/conversations/:id/archive
   * @description Archive a conversation
   * @access Private
   */
  router.put('/conversations/:id/archive', async (req, res, next) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const conversation = await ChatService.archiveConversation(
        conversationId,
        userId,
        tenantId
      );

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation archived successfully'
      });
    } catch (error) {
      logger.error('Error archiving conversation:', error);
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or access denied'
        });
      }
      next(error);
    }
  });

  /**
   * @route DELETE /api/chat/conversations/:id
   * @description Delete a conversation and all its messages
   * @access Private
   */
  router.delete('/conversations/:id', async (req, res, next) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const deleted = await ChatService.deleteConversation(
        conversationId,
        userId,
        tenantId
      );

      if (deleted) {
        res.json({
          success: true,
          message: 'Conversation deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Conversation not found or access denied'
        });
      }
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or access denied'
        });
      }
      next(error);
    }
  });

  /**
   * @route POST /api/chat/knowledge
   * @description Update knowledge base with new content
   * @access Private
   */
  router.post('/knowledge', async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      const { content_type, content_id, content_text, tags = [] } = req.body;

      if (!content_type || !content_id || !content_text) {
        return res.status(400).json({
          success: false,
          error: 'content_type, content_id, and content_text are required'
        });
      }

      const knowledgeEntry = await ChatService.updateKnowledgeBase(
        content_type,
        parseInt(content_id),
        content_text,
        tags,
        tenantId
      );

      res.json({
        success: true,
        data: knowledgeEntry,
        message: 'Knowledge base updated successfully'
      });
    } catch (error) {
      logger.error('Error updating knowledge base:', error);
      next(error);
    }
  });

  /**
   * @route GET /api/chat/health
   * @description Check chat service health and AI availability
   * @access Private
   */
  router.get('/health', async (req, res, next) => {
    try {
      // Test database connectivity
      await ChatService.knex.raw('SELECT 1');
      
      // Test AI service (using existing ollama service)
      const ollamaService = require('../services/ollama.service');
      let aiStatus = 'available';
      try {
        await ollamaService.generateText('Test', { timeout: 5000, maxRetries: 1 });
      } catch (error) {
        aiStatus = 'unavailable';
        logger.warn('AI service health check failed:', error.message);
      }

      res.json({
        success: true,
        data: {
          chat_service: 'healthy',
          database: 'connected',
          ai_service: aiStatus,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Chat service health check failed:', error);
      res.status(503).json({
        success: false,
        error: 'Chat service health check failed',
        data: {
          chat_service: 'unhealthy',
          database: 'disconnected',
          ai_service: 'unknown',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * @route POST /api/chat/quick-message
   * @description Send a quick message without creating a persistent conversation
   * @access Private
   */
  router.post('/quick-message', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { message_text, property_id } = req.body;

      if (!message_text || typeof message_text !== 'string' || message_text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message text is required'
        });
      }

      if (message_text.length > 4000) {
        return res.status(400).json({
          success: false,
          error: 'Message too long (maximum 4000 characters)'
        });
      }

      // Create a temporary conversation context
      const tempConversation = {
        property_id: property_id ? parseInt(property_id) : null,
        user_id: userId,
        tenant_id: tenantId
      };

      // Get context for the message
      const context = await ChatService.getContextForConversation(tempConversation, tenantId);

      // Generate AI response without saving to database
      const prompt = ChatService.buildContextAwarePrompt(message_text.trim(), context, []);
      
      const ollamaService = require('../services/ollama.service');
      const aiResponse = await ollamaService.generateText(prompt, {
        temperature: 0.7,
        max_tokens: 1024,
        timeout: 30000
      });

      res.json({
        success: true,
        data: {
          user_message: message_text.trim(),
          ai_response: aiResponse,
          context_summary: context.summary,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error processing quick message:', error);
      if (error.message.includes('Failed to generate AI response')) {
        return res.status(503).json({
          success: false,
          error: 'AI service temporarily unavailable. Please try again.'
        });
      }
      next(error);
    }
  });

  return router;
};
