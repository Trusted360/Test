const logger = require('../utils/logger');
const { mapOllamaError, ResponseParsingError } = require('../utils/error-handler');
const ollamaService = require('./ollama.service');

/**
 * ChatService - Enhanced conversation management with knowledge base integration
 * Builds on existing OllamaService for LLM interactions
 */
class ChatService {
  constructor(knex) {
    this.knex = knex;
  }

  /**
   * Create a new conversation
   * @param {number} userId - User ID
   * @param {number} propertyId - Optional property context
   * @param {string} title - Optional conversation title
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} - Created conversation
   */
  async createConversation(userId, propertyId = null, title = null, tenantId) {
    try {
      // Generate title if not provided
      if (!title) {
        title = propertyId 
          ? `Property Discussion - ${new Date().toLocaleDateString()}`
          : `General Chat - ${new Date().toLocaleDateString()}`;
      }

      const [conversation] = await this.knex('chat_conversations')
        .insert({
          user_id: userId,
          property_id: propertyId,
          title,
          status: 'active',
          tenant_id: tenantId
        })
        .returning('*');

      logger.info('Created new conversation', { 
        conversationId: conversation.id, 
        userId, 
        propertyId,
        tenantId 
      });

      return conversation;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversations for a user
   * @param {number} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {number} propertyId - Optional property filter
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} - User conversations
   */
  async getConversations(userId, tenantId, propertyId = null, status = 'active') {
    try {
      let query = this.knex('chat_conversations')
        .select([
          'chat_conversations.*',
          'properties.name as property_name',
          this.knex.raw('COUNT(chat_messages.id) as message_count'),
          this.knex.raw('MAX(chat_messages.created_at) as last_message_at')
        ])
        .leftJoin('properties', 'chat_conversations.property_id', 'properties.id')
        .leftJoin('chat_messages', 'chat_conversations.id', 'chat_messages.conversation_id')
        .where('chat_conversations.user_id', userId)
        .where('chat_conversations.tenant_id', tenantId)
        .groupBy('chat_conversations.id', 'properties.name')
        .orderBy('last_message_at', 'desc');

      if (propertyId) {
        query = query.where('chat_conversations.property_id', propertyId);
      }

      if (status) {
        query = query.where('chat_conversations.status', status);
      }

      const conversations = await query;

      logger.debug('Retrieved conversations', { 
        userId, 
        tenantId, 
        propertyId, 
        count: conversations.length 
      });

      return conversations;
    } catch (error) {
      logger.error('Error getting conversations:', error);
      throw error;
    }
  }

  /**
   * Get conversation by ID with access control
   * @param {number} conversationId - Conversation ID
   * @param {number} userId - User ID for access control
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} - Conversation details
   */
  async getConversationById(conversationId, userId, tenantId) {
    try {
      const conversation = await this.knex('chat_conversations')
        .select([
          'chat_conversations.*',
          'properties.name as property_name',
          'properties.address as property_address'
        ])
        .leftJoin('properties', 'chat_conversations.property_id', 'properties.id')
        .where('chat_conversations.id', conversationId)
        .where('chat_conversations.user_id', userId)
        .where('chat_conversations.tenant_id', tenantId)
        .first();

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      return conversation;
    } catch (error) {
      logger.error('Error getting conversation by ID:', error);
      throw error;
    }
  }

  /**
   * Get conversation history (messages)
   * @param {number} conversationId - Conversation ID
   * @param {number} userId - User ID for access control
   * @param {string} tenantId - Tenant ID
   * @param {number} limit - Message limit
   * @param {number} offset - Message offset
   * @returns {Promise<Array>} - Conversation messages
   */
  async getConversationHistory(conversationId, userId, tenantId, limit = 50, offset = 0) {
    try {
      // Verify user has access to this conversation
      await this.getConversationById(conversationId, userId, tenantId);

      const messages = await this.knex('chat_messages')
        .select([
          'chat_messages.*',
          'users.email as sender_email',
          'users.first_name as sender_first_name',
          'users.last_name as sender_last_name'
        ])
        .leftJoin('users', 'chat_messages.sender_id', 'users.id')
        .where('chat_messages.conversation_id', conversationId)
        .orderBy('chat_messages.created_at', 'asc')
        .limit(limit)
        .offset(offset);

      logger.debug('Retrieved conversation history', { 
        conversationId, 
        userId, 
        messageCount: messages.length 
      });

      return messages;
    } catch (error) {
      logger.error('Error getting conversation history:', error);
      throw error;
    }
  }

  /**
   * Send a message and get AI response
   * @param {number} conversationId - Conversation ID
   * @param {string} messageText - User message
   * @param {number} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} - AI response message
   */
  async sendMessage(conversationId, messageText, userId, tenantId) {
    try {
      // Verify user has access to this conversation
      const conversation = await this.getConversationById(conversationId, userId, tenantId);

      // Save user message
      const [userMessage] = await this.knex('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'user',
          sender_id: userId,
          message_text: messageText,
          message_type: 'text'
        })
        .returning('*');

      // Get context for AI response
      const context = await this.getContextForConversation(conversation, tenantId);

      // Generate AI response
      const aiResponseText = await this.generateContextAwareResponse(
        messageText, 
        context, 
        conversationId,
        tenantId
      );

      // Save AI response
      const [aiMessage] = await this.knex('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'assistant',
          sender_id: null,
          message_text: aiResponseText,
          message_type: 'text',
          metadata_json: { context_used: context.summary }
        })
        .returning('*');

      logger.info('Message exchange completed', { 
        conversationId, 
        userId, 
        userMessageId: userMessage.id,
        aiMessageId: aiMessage.id 
      });

      return {
        userMessage,
        aiMessage,
        context: context.summary
      };
    } catch (error) {
      logger.error('Error sending message:', error);
      
      // Save error message for user feedback
      try {
        await this.knex('chat_messages')
          .insert({
            conversation_id: conversationId,
            sender_type: 'assistant',
            sender_id: null,
            message_text: 'I apologize, but I encountered an error processing your message. Please try again.',
            message_type: 'error',
            metadata_json: { error: error.message }
          });
      } catch (saveError) {
        logger.error('Error saving error message:', saveError);
      }

      throw error;
    }
  }

  /**
   * Get contextual information for a conversation
   * @param {Object} conversation - Conversation object
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} - Context information
   */
  async getContextForConversation(conversation, tenantId) {
    try {
      const context = {
        property: null,
        properties: [],
        checklists: [],
        alerts: [],
        templates: [],
        knowledge: [],
        summary: {}
      };

      // Always get all properties for the tenant (for general queries)
      context.properties = await this.knex('properties')
        .select(['id', 'name', 'address', 'status'])
        .where('tenant_id', tenantId)
        .orderBy('name');

      // Always get all checklist templates (for template queries)
      context.templates = await this.knex('checklist_templates')
        .select(['id', 'name', 'description'])
        .where('tenant_id', tenantId)
        .orderBy('name');

      // Get property context if available
      if (conversation.property_id) {
        context.property = await this.knex('properties')
          .where('id', conversation.property_id)
          .where('tenant_id', tenantId)
          .first();

        // Get recent checklists for this property
        context.checklists = await this.knex('property_checklists')
          .select([
            'property_checklists.*',
            'checklist_templates.name as template_name',
            'checklist_templates.description as template_description'
          ])
          .leftJoin('checklist_templates', 'property_checklists.template_id', 'checklist_templates.id')
          .where('property_checklists.property_id', conversation.property_id)
          .orderBy('property_checklists.created_at', 'desc')
          .limit(5);

        // Get recent alerts for this property
        context.alerts = await this.knex('video_alerts')
          .select([
            'video_alerts.*',
            'alert_types.name as alert_type_name',
            'alert_types.description as alert_type_description'
          ])
          .leftJoin('camera_feeds', 'video_alerts.camera_id', 'camera_feeds.id')
          .leftJoin('alert_types', 'video_alerts.alert_type_id', 'alert_types.id')
          .where('camera_feeds.property_id', conversation.property_id)
          .orderBy('video_alerts.created_at', 'desc')
          .limit(10);
      } else {
        // If no specific property, get recent checklists and alerts across all properties
        context.checklists = await this.knex('property_checklists')
          .select([
            'property_checklists.*',
            'checklist_templates.name as template_name',
            'checklist_templates.description as template_description',
            'properties.name as property_name'
          ])
          .leftJoin('checklist_templates', 'property_checklists.template_id', 'checklist_templates.id')
          .leftJoin('properties', 'property_checklists.property_id', 'properties.id')
          .orderBy('property_checklists.created_at', 'desc')
          .limit(10);

        context.alerts = await this.knex('video_alerts')
          .select([
            'video_alerts.*',
            'alert_types.name as alert_type_name',
            'alert_types.description as alert_type_description',
            'properties.name as property_name'
          ])
          .leftJoin('camera_feeds', 'video_alerts.camera_id', 'camera_feeds.id')
          .leftJoin('properties', 'camera_feeds.property_id', 'properties.id')
          .leftJoin('alert_types', 'video_alerts.alert_type_id', 'alert_types.id')
          .orderBy('video_alerts.created_at', 'desc')
          .limit(15);
      }

      // Get relevant knowledge base entries
      const knowledgeTypes = ['checklist_template', 'alert_type', 'property'];
      if (conversation.property_id) {
        knowledgeTypes.push('property_specific');
      }

      context.knowledge = await this.knex('knowledge_base')
        .whereIn('content_type', knowledgeTypes)
        .where('tenant_id', tenantId)
        .orderBy('updated_at', 'desc')
        .limit(20);

      // Create summary for AI context
      context.summary = {
        property_name: context.property?.name || 'General conversation',
        total_properties: context.properties.length,
        total_templates: context.templates.length,
        recent_checklists: context.checklists.length,
        recent_alerts: context.alerts.length,
        knowledge_entries: context.knowledge.length,
        has_property_context: !!conversation.property_id
      };

      logger.debug('Generated conversation context', { 
        conversationId: conversation.id,
        summary: context.summary 
      });

      return context;
    } catch (error) {
      logger.error('Error getting conversation context:', error);
      return {
        property: null,
        properties: [],
        checklists: [],
        alerts: [],
        templates: [],
        knowledge: [],
        summary: { error: 'Failed to load context' }
      };
    }
  }

  /**
   * Generate context-aware AI response using enhanced Ollama service
   * @param {string} userMessage - User's message
   * @param {Object} context - Conversation context
   * @param {number} conversationId - Conversation ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<string>} - AI response text
   */
  async generateContextAwareResponse(userMessage, context, conversationId, tenantId) {
    try {
      // Get recent conversation history
      const recentMessages = await this.knex('chat_messages')
        .select(['sender_type', 'message_text'])
        .where('conversation_id', conversationId)
        .where('message_type', 'text')
        .orderBy('created_at', 'desc')
        .limit(10);

      // Build enhanced context
      const enhancedContext = {
        ...context,
        conversation_history: recentMessages.reverse()
      };

      // Use enhanced Ollama service with stricter parameters
      const response = await ollamaService.generateTrusted360Response(
        userMessage,
        enhancedContext,
        {
          temperature: 0.3,  // Lower for consistency
          max_tokens: 256,   // Much lower to force conciseness
          top_p: 0.8
        }
      );

      // Handle actions if present
      if (response.hasActions) {
        // Log actions for potential execution
        logger.info('AI suggested actions:', {
          conversationId,
          actions: response.actions
        });
      }

      return response.text;
    } catch (error) {
      logger.error('Error generating context-aware response:', error);
      throw new Error('Failed to generate AI response. Please try again.');
    }
  }

  /**
   * Build context-aware prompt for AI
   * @param {string} userMessage - User's message
   * @param {Object} context - Conversation context
   * @param {Array} recentMessages - Recent conversation history
   * @returns {string} - Formatted prompt
   */
  buildContextAwarePrompt(userMessage, context, recentMessages) {
    let prompt = `You are an AI assistant for Trusted360, a security audit and property management platform. 

CONTEXT INFORMATION:
`;

    // Add property context
    if (context.property) {
      prompt += `Property: ${context.property.name}
Address: ${context.property.address}
Type: ${context.property.property_type}
Status: ${context.property.status}

`;
    }

    // Add checklist context
    if (context.checklists.length > 0) {
      prompt += `Recent Checklists (${context.checklists.length}):
`;
      context.checklists.forEach(checklist => {
        prompt += `- ${checklist.template_name}: ${checklist.status} (${checklist.created_at.toDateString()})
`;
      });
      prompt += '\n';
    }

    // Add alert context
    if (context.alerts.length > 0) {
      prompt += `Recent Alerts (${context.alerts.length}):
`;
      context.alerts.forEach(alert => {
        prompt += `- ${alert.alert_type_name}: ${alert.status} (${alert.created_at.toDateString()})
`;
      });
      prompt += '\n';
    }

    // Add knowledge base context
    if (context.knowledge.length > 0) {
      prompt += `Relevant Knowledge:
`;
      context.knowledge.slice(0, 5).forEach(kb => {
        prompt += `- ${kb.content_type}: ${kb.content_text.substring(0, 100)}...
`;
      });
      prompt += '\n';
    }

    // Add conversation history
    if (recentMessages.length > 0) {
      prompt += `Recent Conversation:
`;
      recentMessages.reverse().forEach(msg => {
        const sender = msg.sender_type === 'user' ? 'User' : 'Assistant';
        prompt += `${sender}: ${msg.message_text}
`;
      });
      prompt += '\n';
    }

    prompt += `INSTRUCTIONS:
- Provide helpful, accurate responses about security audits, property management, and platform features
- Use the context information to give specific, relevant answers
- If asked about checklists, alerts, or property data, reference the provided context
- Keep responses professional but friendly
- If you don't have enough context to answer accurately, ask clarifying questions
- Focus on actionable advice and next steps when appropriate

USER MESSAGE: ${userMessage}

RESPONSE:`;

    return prompt;
  }

  /**
   * Update knowledge base with new content
   * @param {string} contentType - Type of content (checklist_template, property, etc.)
   * @param {number} contentId - ID of the content
   * @param {string} contentText - Searchable text representation
   * @param {Array} tags - Optional tags
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} - Updated knowledge entry
   */
  async updateKnowledgeBase(contentType, contentId, contentText, tags = [], tenantId) {
    try {
      // Check if entry already exists
      const existing = await this.knex('knowledge_base')
        .where('content_type', contentType)
        .where('content_id', contentId)
        .where('tenant_id', tenantId)
        .first();

      let result;
      if (existing) {
        // Update existing entry
        [result] = await this.knex('knowledge_base')
          .where('id', existing.id)
          .update({
            content_text: contentText,
            tags,
            updated_at: new Date()
          })
          .returning('*');
      } else {
        // Create new entry
        [result] = await this.knex('knowledge_base')
          .insert({
            content_type: contentType,
            content_id: contentId,
            content_text: contentText,
            tags,
            tenant_id: tenantId
          })
          .returning('*');
      }

      logger.info('Updated knowledge base', { 
        contentType, 
        contentId, 
        tenantId,
        entryId: result.id 
      });

      return result;
    } catch (error) {
      logger.error('Error updating knowledge base:', error);
      throw error;
    }
  }

  /**
   * Archive a conversation
   * @param {number} conversationId - Conversation ID
   * @param {number} userId - User ID for access control
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} - Updated conversation
   */
  async archiveConversation(conversationId, userId, tenantId) {
    try {
      // Verify user has access to this conversation
      await this.getConversationById(conversationId, userId, tenantId);

      const [conversation] = await this.knex('chat_conversations')
        .where('id', conversationId)
        .where('user_id', userId)
        .where('tenant_id', tenantId)
        .update({
          status: 'archived',
          updated_at: new Date()
        })
        .returning('*');

      logger.info('Archived conversation', { conversationId, userId, tenantId });

      return conversation;
    } catch (error) {
      logger.error('Error archiving conversation:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation and all its messages
   * @param {number} conversationId - Conversation ID
   * @param {number} userId - User ID for access control
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteConversation(conversationId, userId, tenantId) {
    try {
      // Verify user has access to this conversation
      await this.getConversationById(conversationId, userId, tenantId);

      // Delete messages first (cascade should handle this, but being explicit)
      await this.knex('chat_messages')
        .where('conversation_id', conversationId)
        .del();

      // Delete conversation
      const deletedCount = await this.knex('chat_conversations')
        .where('id', conversationId)
        .where('user_id', userId)
        .where('tenant_id', tenantId)
        .del();

      logger.info('Deleted conversation', { conversationId, userId, tenantId });

      return deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      throw error;
    }
  }
}

module.exports = ChatService;
