# Trusted360 Chatbot Implementation Guide
*Comprehensive guide for implementing AI-powered chatbot with Ollama*

## Executive Summary

This document outlines the complete implementation of an intelligent chatbot system for Trusted360, leveraging Ollama for local AI inference, optimized for both M3 Pro demo environments and Jetson edge deployment.

## Current Status Assessment

### ✅ Already Implemented
- Database schema (chat_conversations, chat_messages, knowledge_base)
- Backend services (ollama.service.js, chat.service.js)
- Frontend ChatWidget component
- Basic Ollama integration

### ❌ Missing Components
- API routes connecting frontend to backend
- Action execution framework
- Model optimization configuration
- Context management enhancements
- Response streaming

## Implementation Plan

### Phase 1: Complete API Integration (Priority 1)

#### 1.1 Create Chat API Routes

**File: `src/api/routes/chat.routes.js`**
```javascript
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
      const models = await require('../src/services/ollama.service').getModels();
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
```

#### 1.2 Register Chat Routes

**Update: `src/api/routes/index.js`**
```javascript
// Add this line with other route imports
const chatRoutes = require('./chat.routes');

// Add this line with other protected routes
router.use('/chat', chatRoutes);
```

### Phase 2: Model Configuration & Optimization

#### 2.1 Enhanced Ollama Service Configuration

**Update: `src/api/src/services/ollama.service.js`**

Add these configurations at the top:
```javascript
// Model configurations for different environments
const MODEL_CONFIGS = {
  demo: {
    primary: 'llama3.1:8b-instruct-q4_K_M',
    fallback: 'mistral:7b-instruct-v0.3-q4_K_M',
    options: {
      temperature: 0.7,
      top_p: 0.9,
      num_ctx: 16384,
      num_gpu: 999,
      num_thread: 8,
      f16_kv: true,
      use_mlock: true
    }
  },
  production: {
    primary: 'llama3.2:3b-instruct-q4_K_M',
    fallback: 'gemma2:2b-instruct-q4_K_M',
    options: {
      temperature: 0.7,
      top_p: 0.9,
      num_ctx: 8192,
      num_gpu: 99,
      num_thread: 4
    }
  }
};

// Get current environment configuration
function getModelConfig() {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'demo';
  return MODEL_CONFIGS[env];
}
```

Add new method for context-aware generation:
```javascript
/**
 * Generate context-aware response for Trusted360
 */
async function generateTrusted360Response(prompt, context = {}, options = {}) {
  try {
    const modelConfig = getModelConfig();
    const model = options.model || modelConfig.primary;
    
    // Enhanced prompt with Trusted360 context
    const enhancedPrompt = buildTrusted360Prompt(prompt, context);
    
    // Merge options with model config
    const mergedOptions = {
      ...modelConfig.options,
      ...options,
      model
    };
    
    const response = await withRetry(async () => {
      return await ollamaClient.post('/api/generate', {
        model,
        prompt: enhancedPrompt,
        stream: false,
        options: mergedOptions
      });
    });
    
    if (!response.data || !response.data.response) {
      throw new ResponseParsingError('Invalid response from Ollama');
    }
    
    // Parse for actions if needed
    const parsedResponse = parseResponseForActions(response.data.response);
    
    return parsedResponse;
  } catch (error) {
    logger.error('Error generating Trusted360 response:', error);
    throw mapOllamaError(error);
  }
}

/**
 * Build Trusted360-specific prompt
 */
function buildTrusted360Prompt(userMessage, context) {
  let prompt = `You are an AI assistant for Trusted360, a security audit and property management platform for self-storage facilities.

SYSTEM CAPABILITIES:
- Navigate to different pages in the application
- Create alerts and checklists
- Access property information and security data
- Analyze video alerts and maintenance issues
- Generate reports and summaries

CURRENT CONTEXT:
`;

  // Add property context
  if (context.property) {
    prompt += `Property: ${context.property.name}
Address: ${context.property.address}
Type: ${context.property.property_type}
Status: ${context.property.status}

`;
  }

  // Add recent activity context
  if (context.checklists && context.checklists.length > 0) {
    prompt += `Recent Checklists:
${context.checklists.map(c => `- ${c.template_name}: ${c.status}`).join('\n')}

`;
  }

  if (context.alerts && context.alerts.length > 0) {
    prompt += `Recent Alerts:
${context.alerts.map(a => `- ${a.alert_type_name}: ${a.status}`).join('\n')}

`;
  }

  prompt += `RESPONSE GUIDELINES:
- Be professional and concise
- Reference specific data when available
- Suggest actionable next steps
- If you can perform an action, indicate it clearly
- Use the format [ACTION: action_type] for executable actions

AVAILABLE ACTIONS:
- [ACTION: navigate] - Navigate to a specific page
- [ACTION: create_alert] - Create a new alert
- [ACTION: create_checklist] - Create a new checklist
- [ACTION: generate_report] - Generate a report

USER MESSAGE: ${userMessage}

RESPONSE:`;

  return prompt;
}

/**
 * Parse response for executable actions
 */
function parseResponseForActions(responseText) {
  const actionRegex = /\[ACTION:\s*(\w+)(?:\s*-\s*(.+?))?\]/gi;
  const actions = [];
  let match;

  while ((match = actionRegex.exec(responseText)) !== null) {
    actions.push({
      type: match[1].toLowerCase(),
      description: match[2] || '',
      raw: match[0]
    });
  }

  // Clean response text
  const cleanText = responseText.replace(actionRegex, '').trim();

  return {
    text: cleanText,
    actions: actions,
    hasActions: actions.length > 0
  };
}

// Export new functions
module.exports = {
  getModels,
  generateMealPlan,
  generateRecipe,
  analyzeDietaryPreferences,
  generateText,
  generateTrusted360Response,
  getModelConfig
};
```

#### 2.2 Update Chat Service for Enhanced Context

**Update: `src/api/src/services/chat.service.js`**

Replace the `generateContextAwareResponse` method:
```javascript
/**
 * Generate context-aware AI response using enhanced Ollama service
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

    // Use enhanced Ollama service
    const response = await ollamaService.generateTrusted360Response(
      userMessage,
      enhancedContext,
      {
        temperature: 0.7,
        max_tokens: 1024
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
```

### Phase 3: Action Execution Framework

#### 3.1 Create Action Handler Service

**File: `src/api/src/services/action.service.js`**
```javascript
const logger = require('../utils/logger');

/**
 * ActionService - Handles execution of AI-suggested actions
 */
class ActionService {
  constructor(knex) {
    this.knex = knex;
  }

  /**
   * Execute an action based on AI suggestion
   */
  async executeAction(action, userId, tenantId, context = {}) {
    try {
      logger.info('Executing action:', { action, userId, tenantId });

      switch (action.type) {
        case 'navigate':
          return this.handleNavigation(action, context);
        
        case 'create_alert':
          return await this.handleCreateAlert(action, userId, tenantId, context);
        
        case 'create_checklist':
          return await this.handleCreateChecklist(action, userId, tenantId, context);
        
        case 'generate_report':
          return await this.handleGenerateReport(action, userId, tenantId, context);
        
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      logger.error('Error executing action:', error);
      throw error;
    }
  }

  /**
   * Handle navigation actions
   */
  handleNavigation(action, context) {
    const navigationMap = {
      'dashboard': '/dashboard',
      'properties': '/properties',
      'checklists': '/checklists',
      'alerts': '/video/alerts',
      'cameras': '/video/cameras',
      'settings': '/settings'
    };

    // Extract destination from description
    const destination = action.description.toLowerCase();
    let route = '/dashboard'; // default

    for (const [key, path] of Object.entries(navigationMap)) {
      if (destination.includes(key)) {
        route = path;
        break;
      }
    }

    // Add property context if available
    if (context.property_id && (route === '/checklists' || route === '/video/alerts')) {
      route += `?property_id=${context.property_id}`;
    }

    return {
      type: 'navigation',
      route: route,
      message: `Navigating to ${route}`
    };
  }

  /**
   * Handle alert creation
   */
  async handleCreateAlert(action, userId, tenantId, context) {
    // This would integrate with your existing alert creation logic
    const alertData = {
      user_id: userId,
      tenant_id: tenantId,
      property_id: context.property_id,
      alert_type: 'manual',
      description: action.description || 'AI-generated alert',
      status: 'pending',
      priority: 'medium'
    };

    // You would call your existing alert creation service here
    // const alert = await alertService.createAlert(alertData);

    return {
      type: 'alert_created',
      message: 'Alert creation initiated',
      data: alertData
    };
  }

  /**
   * Handle checklist creation
   */
  async handleCreateChecklist(action, userId, tenantId, context) {
    // This would integrate with your existing checklist creation logic
    const checklistData = {
      user_id: userId,
      tenant_id: tenantId,
      property_id: context.property_id,
      title: action.description || 'AI-generated checklist',
      status: 'pending'
    };

    return {
      type: 'checklist_created',
      message: 'Checklist creation initiated',
      data: checklistData
    };
  }

  /**
   * Handle report generation
   */
  async handleGenerateReport(action, userId, tenantId, context) {
    // This would integrate with your reporting system
    return {
      type: 'report_generated',
      message: 'Report generation initiated',
      data: {
        type: 'summary',
        property_id: context.property_id,
        requested_by: userId
      }
    };
  }
}

module.exports = ActionService;
```

#### 3.2 Update Chat Routes for Action Execution

Add to `src/api/routes/chat.routes.js`:
```javascript
const ActionService = require('../src/services/action.service');
const actionService = new ActionService(require('../config/database'));

// Execute action endpoint
router.post('/actions/execute', async (req, res) => {
  try {
    const { action, context = {} } = req.body;

    if (!action || !action.type) {
      return res.status(400).json({
        success: false,
        message: 'Action type is required'
      });
    }

    const result = await actionService.executeAction(
      action,
      req.user.id,
      req.user.tenant_id,
      context
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error executing action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute action'
    });
  }
});
```

### Phase 4: Frontend Enhancements

#### 4.1 Update Chat Service for Actions

**Update: `src/dashboard/src/services/chat.service.ts`**

Add action execution method:
```typescript
// Add to ChatService class
async executeAction(action: {
  type: string;
  description?: string;
}, context?: {
  property_id?: number;
}): Promise<ApiResponse<any>> {
  const response = await api.post('/chat/actions/execute', {
    action,
    context
  });
  return response.data;
}
```

#### 4.2 Enhanced ChatWidget with Action Support

**Update: `src/dashboard/src/components/ChatWidget/index.tsx`**

Add action handling:
```typescript
// Add to component state
const [pendingActions, setPendingActions] = useState<any[]>([]);

// Add action execution handler
const executeAction = async (action: any) => {
  try {
    setLoading(true);
    const result = await chatService.executeAction(action, {
      property_id: propertyId
    });
    
    if (result.data.type === 'navigation') {
      // Handle navigation
      window.location.href = result.data.route;
    } else {
      // Show success message
      setMessages(prev => [...prev, {
        id: Date.now(),
        conversation_id: currentConversation!.id,
        sender_type: 'system',
        message_text: result.data.message,
        message_type: 'action_result',
        created_at: new Date().toISOString()
      }]);
    }
    
    setPendingActions(prev => prev.filter(a => a !== action));
  } catch (error) {
    console.error('Error executing action:', error);
    setError('Failed to execute action');
  } finally {
    setLoading(false);
  }
};

// Update sendMessage to handle actions
const sendMessage = async () => {
  if (!newMessage.trim() || !currentConversation || sending) return;

  try {
    setSending(true);
    setError(null);

    // Add user message to UI immediately
    const userMsg = {
      id: Date.now(),
      conversation_id: currentConversation.id,
      sender_type: 'user',
      sender_id: 1,
      message_text: newMessage.trim(),
      message_type: 'text',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setNewMessage('');

    const response = await chatService.sendMessage(currentConversation.id, newMessage.trim());
    
    if (response.success && response.data.ai_response) {
      const aiMsg = response.data.ai_response;
      setMessages(prev => [...prev, aiMsg]);
      
      // Check for actions in the response
      if (aiMsg.metadata_json?.actions) {
        setPendingActions(aiMsg.metadata_json.actions);
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
    setError('Failed to send message');
  } finally {
    setSending(false);
  }
};
```

### Phase 5: Model Setup & Testing

#### 5.1 Model Installation Script

**File: `scripts/setup-ollama-models.sh`**
```bash
#!/bin/bash

echo "Setting up Ollama models for Trusted360..."

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Ollama is not installed. Please install it first:"
    echo "curl -fsSL https://ollama.ai/install.sh | sh"
    exit 1
fi

# Start Ollama service
echo "Starting Ollama service..."
ollama serve &
sleep 5

# Pull models based on environment
if [ "$NODE_ENV" = "production" ]; then
    echo "Installing production models..."
    ollama pull llama3.2:3b-instruct-q4_K_M
    ollama pull gemma2:2b-instruct-q4_K_M
else
    echo "Installing demo models..."
    ollama pull llama3.1:8b-instruct-q4_K_M
    ollama pull mistral:7b-instruct-v0.3-q4_K_M
fi

echo "Model installation complete!"
echo "Available models:"
ollama list
```

#### 5.2 Environment Configuration

**Update: `.env.example`**
```env
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL_PRIMARY=llama3.1:8b-instruct-q4_K_M
OLLAMA_MODEL_FALLBACK=mistral:7b-instruct-v0.3-q4_K_M

# Chat Configuration
CHAT_CONTEXT_WINDOW=16384
CHAT_MAX_HISTORY=10
CHAT_RESPONSE_TIMEOUT=30000
```

### Phase 6: Testing & Validation

#### 6.1 Chat System Test Suite

**File: `src/api/src/tests/chat.test.js`**
```javascript
const request = require('supertest');
const app = require('../index');
const { setupTestDb, teardownTestDb } = require('./helpers/db');

describe('Chat API', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await setupTestDb();
    // Setup test user and get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@trusted360.com',
        password: 'testpass123'
      });
    
    authToken = loginResponse.body.token;
    testUser = loginResponse.body.user;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('GET /api/chat/health', () => {
    it('should return chat system health status', async () => {
      const response = await request(app)
        .get('/api/chat/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('database_connected');
      expect(response.body.data).toHaveProperty('ai_service_available');
    });
  });

  describe('POST /api/chat/conversations', () => {
    it('should create a new conversation', async () => {
      const response = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Conversation',
          property_id: null
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test Conversation');
    });
  });

  describe('POST /api/chat/quick-message', () => {
    it('should process a quick message', async () => {
      const response = await request(app)
        .post('/api/chat/quick-message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message_text: 'Hello, what can you help me with?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ai_response');
    });
  });
});
```

### Phase 7: Performance Optimization

#### 7.1 Response Caching Strategy

**File: `src/api/src/middleware/chat-cache.js`**
```javascript
const { redisClient } = require('../services/redis');
const logger = require('../utils/logger');

/**
 * Cache middleware for chat responses
 */
const chatCache = (ttl = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `chat:${req.user.id}:${req.originalUrl}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug('Serving cached response', { cacheKey });
        return res.json(JSON.parse(cached));
      }

      // Store original res.json
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        if (data.success) {
          redisClient.set(cacheKey, JSON.stringify(data), { EX: ttl })
            .catch(err => logger.error('Cache set error:', err));
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

module.exports = chatCache;
```

#### 7.2 Context Optimization

**File: `src/api/src/services/context.service.js`**
```javascript
const logger = require('../utils/logger');
const { redisClient } = require('./redis');

/**
 * ContextService - Optimized context management for chat
 */
class ContextService {
  constructor(knex) {
    this.knex = knex;
  }

  /**
   * Get optimized context for property
   */
  async getPropertyContext(propertyId, tenantId, useCache = true) {
    const cacheKey = `context:property:${propertyId}:${tenantId}`;

    if (useCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn('Context cache read error:', error);
      }
    }

    const context = await this.buildPropertyContext(propertyId, tenantId);

    // Cache for 30 minutes
    if (useCache) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(context), { EX: 1800 });
      } catch (error) {
        logger.warn('Context cache write error:', error);
      }
    }

    return context;
  }

  /**
   * Build comprehensive property context
   */
  async buildPropertyContext(propertyId, tenantId) {
    const context = {
      property: null,
      checklists: [],
      alerts: [],
      cameras: [],
      stats: {}
    };

    // Get property details
    context.property = await this.knex('properties')
      .where('id', propertyId)
      .where('tenant_id', tenantId)
      .first();

    if (!context.property) {
      return context;
    }

    // Get recent checklists (last 5)
    context.checklists = await this.knex('property_checklists')
      .select([
        'property_checklists.*',
        'checklist_templates.name as template_name'
      ])
      .leftJoin('checklist_templates', 'property_checklists.template_id', 'checklist_templates.id')
      .where('property_checklists.property_id', propertyId)
      .where('property_checklists.tenant_id', tenantId)
      .orderBy('property_checklists.created_at', 'desc')
      .limit(5);

    // Get recent alerts (last 10)
    context.alerts = await this.knex('video_alerts')
      .select([
        'video_alerts.*',
        'alert_types.name as alert_type_name'
      ])
      .leftJoin('camera_feeds', 'video_alerts.camera_id', 'camera_feeds.id')
      .leftJoin('alert_types', 'video_alerts.alert_type_id', 'alert_types.id')
      .where('camera_feeds.property_id', propertyId)
      .where('video_alerts.tenant_id', tenantId)
      .orderBy('video_alerts.created_at', 'desc')
      .limit(10);

    // Get camera count
    const cameraCount = await this.knex('camera_feeds')
      .where('property_id', propertyId)
      .where('tenant_id', tenantId)
      .count('id as count')
      .first();

    context.stats = {
      camera_count: parseInt(cameraCount.count),
      recent_checklist_count: context.checklists.length,
      recent_alert_count: context.alerts.length
    };

    return context;
  }
}

module.exports = ContextService;
```

## Implementation Timeline

### Week 1: Core API Implementation
- [ ] Create chat API routes (`chat.routes.js`)
- [ ] Register routes in main router
- [ ] Test basic conversation CRUD operations
- [ ] Verify Ollama connection and health checks

### Week 2: Model Configuration & Enhancement
- [ ] Update Ollama service with Trusted360-specific methods
- [ ] Implement action parsing and response enhancement
- [ ] Configure model settings for M3 Pro demo environment
- [ ] Test context-aware response generation

### Week 3: Action Framework & Frontend
- [ ] Create action service for executable commands
- [ ] Update chat service for action handling
- [ ] Enhance ChatWidget with action execution
- [ ] Implement confirmation dialogs for actions

### Week 4: Testing & Optimization
- [ ] Create comprehensive test suite
- [ ] Implement caching and performance optimizations
- [ ] Load test with expected demo scenarios
- [ ] Fine-tune model parameters and context management

## Deployment Instructions

### 1. Install Ollama
```bash
# macOS
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve
```

### 2. Install Models
```bash
# For M3 Pro demo environment
chmod +x scripts/setup-ollama-models.sh
./scripts/setup-ollama-models.sh
```

### 3. Environment Setup
```bash
# Copy and configure environment variables
cp .env.example .env

# Update Ollama configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL_PRIMARY=llama3.1:8b-instruct-q4_K_M
```

### 4. Database Migration
```bash
# Run chat system migrations (already exists)
npm run migrate
```

### 5. Start Services
```bash
# Start the full stack
npm run dev

# Or start individual services
npm run api:dev    # API server
npm run ui:dev     # Frontend
```

## Testing Scenarios

### Basic Chat Functionality
1. **Health Check**: Verify `/api/chat/health` returns proper status
2. **Conversation Creation**: Create new conversations with/without property context
3. **Message Exchange**: Send messages and receive AI responses
4. **Context Awareness**: Test property-specific context in responses

### Action Execution
1. **Navigation**: Test "show me the dashboard" → navigation action
2. **Alert Creation**: Test "create an alert for this property" → alert creation
3. **Checklist Generation**: Test "create a security checklist" → checklist creation
4. **Report Generation**: Test "generate a summary report" → report action

### Performance Testing
1. **Response Time**: Measure average response time (target: <3 seconds)
2. **Concurrent Users**: Test multiple simultaneous conversations
3. **Memory Usage**: Monitor RAM usage during extended conversations
4. **Context Scaling**: Test with large property datasets

## Troubleshooting Guide

### Common Issues

#### Ollama Connection Errors
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama service
pkill ollama
ollama serve
```

#### Model Loading Issues
```bash
# Check available models
ollama list

# Pull missing models
ollama pull llama3.1:8b-instruct-q4_K_M
```

#### Memory Issues on M3 Pro
```bash
# Monitor memory usage
top -pid $(pgrep ollama)

# Use smaller model if needed
export OLLAMA_MODEL_PRIMARY=llama3.2:3b-instruct-q4_K_M
```

#### API Route Issues
```bash
# Check if chat routes are registered
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/chat/health
```

## Performance Benchmarks

### Expected Performance on M3 Pro (18GB RAM)

| Model | Response Time | Memory Usage | Tokens/sec |
|-------|---------------|--------------|------------|
| Llama 3.1 8B | 2-4 seconds | ~5GB | 40-60 |
| Mistral 7B | 1.5-3 seconds | ~4GB | 50-70 |
| Llama 3.2 3B | 1-2 seconds | ~2GB | 80-100 |

### Context Window Usage
- System Prompt: ~500 tokens
- Property Context: ~1000 tokens  
- Conversation History: ~1500 tokens
- User Query: ~100 tokens
- **Total**: ~3100 tokens (well within 16K limit)

## Security Considerations

### Authentication & Authorization
- All chat endpoints require JWT authentication
- User can only access their own conversations
- Tenant isolation enforced at database level
- Action execution requires proper permissions

### Data Privacy
- Conversations stored locally in PostgreSQL
- AI processing happens locally via Ollama
- No data sent to external AI services
- Audit logging for all actions

### Input Validation
- Message text sanitization
- Action parameter validation
- SQL injection prevention
- Rate limiting on API endpoints

## Future Enhancements

### Phase 2 Features
- [ ] Response streaming for real-time chat experience
- [ ] Voice input/output integration
- [ ] Multi-language support
- [ ] Advanced analytics and insights

### Jetson Optimization
- [ ] TensorRT model optimization
- [ ] ARM-specific model quantization
- [ ] Edge-specific caching strategies
- [ ] Offline operation capabilities

### Advanced AI Features
- [ ] Document analysis and summarization
- [ ] Image analysis integration
- [ ] Predictive maintenance suggestions
- [ ] Automated report generation

## Conclusion

This implementation guide provides a complete roadmap for integrating an intelligent chatbot into your Trusted360 platform. The system leverages local AI processing for privacy and performance while providing contextual, actionable assistance to users.

The modular architecture allows for easy scaling from M3 Pro demo environments to Jetson edge deployments, ensuring consistent performance across different hardware configurations.

Key benefits:
- **Privacy**: All AI processing happens locally
- **Performance**: Optimized for Apple Silicon and ARM architectures  
- **Context**: Deep integration with existing property and security data
- **Actions**: Ability to execute commands and navigate the application
- **Scalability**: Designed for both demo and production environments

Follow the implementation timeline and testing scenarios to ensure a successful deployment of your AI-powered chatbot system.
