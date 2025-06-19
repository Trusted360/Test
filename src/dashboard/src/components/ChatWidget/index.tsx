import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Fab,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  Divider
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { chatService, type Message, type Conversation } from '../../services/chat.service';

interface ChatWidgetProps {
  propertyId?: number;
  propertyName?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ propertyId, propertyName }) => {
  console.log('ChatWidget rendering...');
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await chatService.getConversations({
        property_id: propertyId,
        limit: 10
      });
      setConversations(response.data);
    } catch (err: any) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await chatService.getMessages(conversationId, { limit: 50 });
      setMessages(response.data);
    } catch (err: any) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = async () => {
    try {
      setLoading(true);
      setError(null);
      const title = propertyName 
        ? `Chat about ${propertyName}` 
        : 'New Conversation';
      
      const response = await chatService.createConversation({
        title,
        property_id: propertyId
      });
      
      const newConv = response.data;
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversation(newConv);
      setMessages([]);
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      setError('Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation || sending) return;

    try {
      setSending(true);
      setError(null);
      
      const response = await chatService.sendMessage(currentConversation.id, newMessage.trim());
      
      // Add both user message and AI response to the messages
      const newMessages = [response.data.user_message];
      if (response.data.ai_message) {
        newMessages.push(response.data.ai_message);
      }
      
      setMessages(prev => [...prev, ...newMessages]);
      setNewMessage('');
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (conversations.length === 0) {
      loadConversations();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    loadMessages(conversation.id);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* Chat Fab Button */}
      <Fab
        color="primary"
        aria-label="chat"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
        }}
        onClick={handleOpen}
      >
        <ChatIcon />
      </Fab>

      {/* Chat Widget */}
      <Collapse in={isOpen}>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            width: 400,
            height: 500,
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Typography variant="h6">
              AI Assistant
              {propertyName && (
                <Typography variant="caption" display="block">
                  {propertyName}
                </Typography>
              )}
            </Typography>
            <IconButton
              size="small"
              onClick={handleClose}
              sx={{ color: 'inherit' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {error && (
            <Alert severity="error" sx={{ m: 1 }}>
              {error}
            </Alert>
          )}

          {/* Content */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!currentConversation ? (
              // Conversation List
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Recent Conversations
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label="Start New Chat"
                      onClick={createNewConversation}
                      color="primary"
                      variant="outlined"
                      sx={{ cursor: 'pointer' }}
                    />
                  </Box>
                </Box>
                
                {loading ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <List dense>
                    {conversations.map((conv) => (
                      <ListItem
                        key={conv.id}
                        disablePadding
                      >
                        <ListItemButton onClick={() => handleConversationSelect(conv)}>
                          <ListItemText
                            primary={conv.title}
                            secondary={`${conv.message_count} messages`}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            ) : (
              // Chat Interface
              <>
                {/* Chat Header */}
                <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" noWrap>
                    {currentConversation.title}
                  </Typography>
                  <Chip
                    label="← Back to conversations"
                    size="small"
                    onClick={() => setCurrentConversation(null)}
                    sx={{ cursor: 'pointer', mt: 0.5 }}
                  />
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                  {loading ? (
                    <Box display="flex" justifyContent="center" p={2}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <Box
                          key={message.id}
                          sx={{
                            display: 'flex',
                            mb: 1,
                            justifyContent: message.sender_type === 'user' ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: '80%',
                              p: 1,
                              borderRadius: 2,
                              bgcolor: message.sender_type === 'user' 
                                ? 'primary.main' 
                                : 'grey.100',
                              color: message.sender_type === 'user' 
                                ? 'primary.contrastText' 
                                : 'text.primary'
                            }}
                          >
                            <Box display="flex" alignItems="center" mb={0.5}>
                              {message.sender_type === 'user' ? (
                                <PersonIcon sx={{ fontSize: 16, mr: 0.5 }} />
                              ) : (
                                <BotIcon sx={{ fontSize: 16, mr: 0.5 }} />
                              )}
                              <Typography variant="caption">
                                {formatTime(message.created_at)}
                              </Typography>
                            </Box>
                            <Typography variant="body2">
                              {message.message_text}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </Box>

                {/* Message Input */}
                <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
                  <Box display="flex" gap={1}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={sending}
                      multiline
                      maxRows={3}
                    />
                    <IconButton
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      color="primary"
                    >
                      {sending ? <CircularProgress size={20} /> : <SendIcon />}
                    </IconButton>
                  </Box>
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </Collapse>
    </>
  );
};

export default ChatWidget;
