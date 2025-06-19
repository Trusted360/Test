const express = require('express');
const router = express.Router();
const ChatService = require('../src/services/chat.service');
const { authenticateJWT } = require('../src/middleware/auth');
const logger = require('../src/utils/logger');

// Initialize chat service
const chatService = new ChatService(require('../config/database'));

// Apply authentication to all routes
router.use(authenticateJWT);

// Health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      database_connected: true,
      ai_service_available: false,
      service_status: 'operational'
    };

    // Test Ollama connection
    try {
      const ollamaService = require('../src/services/ollama.service');
      const models = await ollamaService.getModels();
      health.ai_service_available = models.length > 0;
    } catch (error) {
      health.ai_service_available = false;
      health.service_status = 'ai_service_unavailable';
    }

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Chat health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed'
    });
  }
});

// Get conversations
router.get('/conversations', async (req, res) => {
  try {
    const { property_id, status = 'active', limit = 20, offset = 0 } = req.query;
    const conversations = await chatService.getConversations(
      req.user.id,
      req.user.tenant_id,
      property_id ? parseInt(property_id) : null,
      status
    );

    res.json({
      success: true,
      data: conversations,
      count: conversations.length
    });
  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations'
    });
  }
});

// Create conversation
router.post('/conversations', async (req, res) => {
  try {
    const { title, property_id } = req.body;
    const conversation = await chatService.createConversation(
      req.user.id,
      property_id || null,
      title,
      req.user.tenant_id
    );

    res.status(201).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    logger.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation'
    });
  }
});

// Get conversation by ID
router.get('/conversations/:id', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const conversation = await chatService.getConversationById(
      conversationId,
      req.user.id,
      req.user.tenant_id
    );

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    logger.error('Error fetching conversation:', error);
    res.status(404).json({
      success: false,
      message: 'Conversation not found'
    });
  }
});

// Get messages for conversation
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { limit = 50, offset = 0 } = req.query;
    
    const messages = await chatService.getConversationHistory(
      conversationId,
      req.user.id,
      req.user.tenant_id,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// Send message
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { message_text } = req.body;

    if (!message_text || !message_text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    const result = await chatService.sendMessage(
      conversationId,
      message_text.trim(),
      req.user.id,
      req.user.tenant_id
    );

    res.json({
      success: true,
      data: {
        user_message: result.userMessage,
        ai_response: result.aiMessage
      }
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Archive conversation
router.put('/conversations/:id/archive', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const conversation = await chatService.archiveConversation(
      conversationId,
      req.user.id,
      req.user.tenant_id
    );

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    logger.error('Error archiving conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive conversation'
    });
  }
});

// Delete conversation
router.delete('/conversations/:id', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    await chatService.deleteConversation(
      conversationId,
      req.user.id,
      req.user.tenant_id
    );

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation'
    });
  }
});

// Quick message (no conversation needed)
router.post('/quick-message', async (req, res) => {
  try {
    const { message_text, property_id } = req.body;

    if (!message_text || !message_text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    // Create temporary conversation
    const conversation = await chatService.createConversation(
      req.user.id,
      property_id || null,
      'Quick Chat',
      req.user.tenant_id
    );

    // Send message
    const result = await chatService.sendMessage(
      conversation.id,
      message_text.trim(),
      req.user.id,
      req.user.tenant_id
    );

    res.json({
      success: true,
      data: {
        user_message: message_text,
        ai_response: result.aiMessage.message_text
      }
    });
  } catch (error) {
    logger.error('Error processing quick message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process message'
    });
  }
});

// Update knowledge base
router.post('/knowledge', async (req, res) => {
  try {
    const { content_type, content_id, content_text, tags = [] } = req.body;

    const knowledge = await chatService.updateKnowledgeBase(
      content_type,
      content_id,
      content_text,
      tags,
      req.user.tenant_id
    );

    res.json({
      success: true,
      data: knowledge
    });
  } catch (error) {
    logger.error('Error updating knowledge base:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update knowledge base'
    });
  }
});

module.exports = router;
