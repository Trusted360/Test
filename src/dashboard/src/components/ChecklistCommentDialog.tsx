import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Divider,
  Alert
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Send as SendIcon
} from '@mui/icons-material';
import api from '../services/api';
import { ChecklistComment } from '../types/checklist.types';

interface ChecklistCommentDialogProps {
  open: boolean;
  onClose: () => void;
  checklistId: number;
  itemId: number;
  itemText: string;
}

const ChecklistCommentDialog: React.FC<ChecklistCommentDialogProps> = ({
  open,
  onClose,
  checklistId,
  itemId,
  itemText
}) => {
  const [comments, setComments] = useState<ChecklistComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadComments();
    }
  }, [open, checklistId, itemId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/checklists/${checklistId}/items/${itemId}/comments`);
      setComments(response.data.data || []);
    } catch (err: any) {
      setError('Failed to load comments');
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      
      const response = await api.post(`/checklists/${checklistId}/items/${itemId}/comments`, {
        comment_text: newComment
      });

      // Add the new comment to the list
      setComments([response.data.data, ...comments]);
      setNewComment('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.delete(`/checklists/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Comments</Typography>
        <Typography variant="body2" color="text.secondary">
          {itemText}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            variant="outlined"
          />
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleAddComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? 'Adding...' : 'Add Comment'}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
            No comments yet
          </Typography>
        ) : (
          <List>
            {comments.map((comment, index) => (
              <React.Fragment key={comment.id}>
                {index > 0 && <Divider />}
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="subtitle2">
                          {comment.created_by_name || comment.created_by_email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(comment.created_at)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                        {comment.comment_text}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteComment(comment.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChecklistCommentDialog;
