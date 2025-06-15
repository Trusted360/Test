import api from './api';

export interface Conversation {
  id: number;
  user_id: number;
  property_id?: number;
  title: string;
  status: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  property_name?: string;
  message_count: string;
  last_message_at?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_type: string;
  sender_id?: number;
  message_text: string;
  message_type: string;
  metadata_json?: any;
  created_at: string;
}

export interface KnowledgeEntry {
  id: number;
  content_type: string;
  content_id?: number;
  content_text: string;
  tags: string[];
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatHealth {
  database_connected: boolean;
  ai_service_available: boolean;
  service_status: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

class ChatService {
  // Conversation Management
  async getConversations(filters?: {
    property_id?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Conversation[]>> {
    const response = await api.get('/chat/conversations', { params: filters });
    return response.data;
  }

  async createConversation(data: {
    title: string;
    property_id?: number;
  }): Promise<ApiResponse<Conversation>> {
    const response = await api.post('/chat/conversations', data);
    return response.data;
  }

  async getConversationById(id: number): Promise<ApiResponse<Conversation>> {
    const response = await api.get(`/chat/conversations/${id}`);
    return response.data;
  }

  async archiveConversation(id: number): Promise<ApiResponse<Conversation>> {
    const response = await api.put(`/chat/conversations/${id}/archive`);
    return response.data;
  }

  async deleteConversation(id: number): Promise<ApiResponse<void>> {
    const response = await api.delete(`/chat/conversations/${id}`);
    return response.data;
  }

  // Message Management
  async getMessages(conversationId: number, filters?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Message[]>> {
    const response = await api.get(`/chat/conversations/${conversationId}/messages`, { params: filters });
    return response.data;
  }

  async sendMessage(conversationId: number, messageText: string): Promise<ApiResponse<{
    user_message: Message;
    ai_response?: Message;
  }>> {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, {
      message_text: messageText
    });
    return response.data;
  }

  // Knowledge Base
  async updateKnowledge(data: {
    content_type: string;
    content_id?: number;
    content_text: string;
    tags?: string[];
  }): Promise<ApiResponse<KnowledgeEntry>> {
    const response = await api.post('/chat/knowledge', data);
    return response.data;
  }

  // Utility
  async getHealth(): Promise<ApiResponse<ChatHealth>> {
    const response = await api.get('/chat/health');
    return response.data;
  }

  async quickMessage(messageText: string, context?: {
    property_id?: number;
  }): Promise<ApiResponse<{
    user_message: string;
    ai_response?: string;
  }>> {
    const response = await api.post('/chat/quick-message', {
      message_text: messageText,
      ...context
    });
    return response.data;
  }
}

export const chatService = new ChatService();
