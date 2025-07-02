import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Checkbox,
  TextField,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Autocomplete,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  PlayArrow as PlayArrowIcon,
  Approval as ApprovalIcon,
  AttachFile as AttachFileIcon,
  CameraAlt as CameraAltIcon,
  Comment as CommentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Person as PersonIcon,
  CloudUpload as CloudUploadIcon,
  CalendarToday as CalendarTodayIcon
} from '@mui/icons-material';
import { 
  Checklist,
  ChecklistItem,
  ChecklistItemUpdate,
  ChecklistComment
} from '../../types/checklist.types';
import { checklistService } from '../../services/checklist.service';
import api from '../../services/api';
import ChecklistCommentDialog from '../../components/ChecklistCommentDialog';
import MobileCameraCapture from '../../components/MobileCameraCapture';

interface ChecklistDetailProps {
  editMode?: boolean;
}

const ChecklistDetail: React.FC<ChecklistDetailProps> = ({ editMode: initialEditMode = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(initialEditMode || location.pathname.includes('/edit'));
  const [saving, setSaving] = useState(false);
  
  // Item states
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [itemUpdates, setItemUpdates] = useState<Map<number, ChecklistItemUpdate>>(new Map());
  
  // Comment dialog state
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItemText, setSelectedItemText] = useState<string>('');
  
  // File upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Camera capture state
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [selectedPhotoItemId, setSelectedPhotoItemId] = useState<number | null>(null);
  
  // Assignment state
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Due date edit state
  const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);

  useEffect(() => {
    if (id) {
      loadChecklist();
    }
  }, [id]);

  useEffect(() => {
    // Update edit mode based on route
    setIsEditing(initialEditMode || location.pathname.includes('/edit'));
  }, [location.pathname, initialEditMode]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await checklistService.getChecklist(Number(id));
      setChecklist(response);
      
      // Initialize item updates with current values
      const updates = new Map<number, ChecklistItemUpdate>();
      response.items?.forEach(item => {
        updates.set(item.id, {
          status: item.response_id ? 'completed' : 'pending',
          notes: item.notes || ''
        });
      });
      setItemUpdates(updates);
      
      // Set selected user for assignment
      if (response.assigned_to) {
        setSelectedUserId(response.assigned_to);
      }
      
      // Set due date
      if (response.due_date) {
        setSelectedDueDate(new Date(response.due_date));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load checklist');
      console.error('Error loading checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      // Try to get users list - this requires admin role
      const response = await api.get('/auth/users');
      setUsers(response.data.data || []);
    } catch (err: any) {
      console.error('Error loading users:', err);
      // If user is not admin, we can still show a simple input field
      if (err.response?.status === 403) {
        // User doesn't have permission to list all users
        setUsers([]);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleItemToggle = async (item: ChecklistItem) => {
    if (!checklist || !isEditing) return;
    
    const currentUpdate = itemUpdates.get(item.id);
    if (!currentUpdate) return;
    
    const newStatus = currentUpdate.status === 'completed' ? 'pending' : 'completed';
    
    // Update local state immediately
    setItemUpdates(new Map(itemUpdates.set(item.id, {
      ...currentUpdate,
      status: newStatus
    })));
    
    try {
      setSaving(true);
      
      // If checklist is pending, update it to in_progress first
      if (checklist.status === 'pending') {
        await api.put(`/checklists/${checklist.id}/status`, {
          status: 'in_progress'
        });
      }
      
      if (newStatus === 'completed') {
        // Complete the item
        await api.post(`/checklists/${checklist.id}/items/${item.id}/complete`, {
          response_value: 'checked',
          notes: currentUpdate.notes || '',
          requires_approval: false
        });
      } else {
        // Uncomplete the item
        await api.delete(`/checklists/${checklist.id}/items/${item.id}/complete`);
      }
      
      await loadChecklist(); // Reload to get updated data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update item');
      // Revert the change
      setItemUpdates(new Map(itemUpdates.set(item.id, {
        ...currentUpdate,
        status: currentUpdate.status
      })));
    } finally {
      setSaving(false);
    }
  };

  const handleItemNotesChange = (itemId: number, notes: string) => {
    const currentUpdate = itemUpdates.get(itemId);
    if (!currentUpdate) return;
    
    setItemUpdates(new Map(itemUpdates.set(itemId, {
      ...currentUpdate,
      notes
    })));
  };

  const handleSaveItem = async (item: ChecklistItem) => {
    const update = itemUpdates.get(item.id);
    if (!update || !checklist) return;
    
    try {
      setSaving(true);
      
      // Use the complete item endpoint
      await api.post(`/checklists/${checklist.id}/items/${item.id}/complete`, {
        response_value: update.status === 'completed' ? 'checked' : '',
        notes: update.notes || '',
        requires_approval: false
      });
      
      await loadChecklist(); // Reload to get updated data
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCommentDialog = (item: ChecklistItem) => {
    setSelectedItemId(item.id);
    setSelectedItemText(item.item_text || item.title || `Item ${item.id}`);
    setCommentDialogOpen(true);
  };
  
  const handleCloseCommentDialog = () => {
    setCommentDialogOpen(false);
    setSelectedItemId(null);
    setSelectedItemText('');
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedItemId || !checklist) return;
    
    try {
      setUploading(true);
      
      // Get the item
      const item = checklist.items?.find(i => i.id === selectedItemId);
      if (!item) {
        setError('Checklist item not found');
        return;
      }
      
      let responseId = item.response_id;
      
      // If no response exists, create one first
      if (!responseId) {
        const responseData = await api.post(`/checklists/${checklist.id}/items/${selectedItemId}/complete`, {
          response_value: '', // Empty value to allow file upload
          notes: 'File attachment pending'
        });
        responseId = responseData.data.data.id;
      }
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('response_id', responseId.toString());
      
      await api.post(`/checklists/${checklist.id}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSelectedFile(null);
      setUploadDialogOpen(false);
      await loadChecklist();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (file: File) => {
    if (!selectedPhotoItemId || !checklist) return;
    
    try {
      setUploading(true);
      
      // Get the item
      const item = checklist.items?.find(i => i.id === selectedPhotoItemId);
      if (!item) {
        setError('Checklist item not found');
        return;
      }
      
      let responseId = item.response_id;
      
      // If no response exists, create one first
      if (!responseId) {
        const responseData = await api.post(`/checklists/${checklist.id}/items/${selectedPhotoItemId}/complete`, {
          response_value: '', // Empty value to allow photo upload
          notes: 'Photo attachment pending'
        });
        responseId = responseData.data.data.id;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('response_id', responseId.toString());
      
      await api.post(`/checklists/${checklist.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setCameraDialogOpen(false);
      setSelectedPhotoItemId(null);
      await loadChecklist();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleAssignUser = async () => {
    if (!checklist || selectedUserId === null) return;
    
    try {
      setSaving(true);
      
      // Update the checklist assignment
      await api.put(`/checklists/${checklist.id}`, {
        assigned_to: selectedUserId
      });
      
      setAssignmentDialogOpen(false);
      await loadChecklist();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign user');
    } finally {
      setSaving(false);
    }
  };
  
  const handleUpdateDueDate = async () => {
    if (!checklist) return;
    
    try {
      setSaving(true);
      
      await api.put(`/checklists/${checklist.id}`, {
        due_date: selectedDueDate ? selectedDueDate.toISOString() : null
      });
      
      setDueDateDialogOpen(false);
      await loadChecklist();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update due date');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!checklist) return;
    
    try {
      setSaving(true);
      await api.put(`/checklists/${checklist.id}/status`, {
        status: 'completed'
      });
      await loadChecklist();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit for approval');
    } finally {
      setSaving(false);
    }
  };

  const toggleItemExpanded = (itemId: number, event?: React.MouseEvent) => {
    // Prevent toggling when clicking on action buttons
    if (event) {
      event.stopPropagation();
    }
    
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ScheduleIcon />;
      case 'in_progress':
        return <PlayArrowIcon />;
      case 'completed':
        return <CheckCircleIcon />;
      case 'approved':
        return <ApprovalIcon />;
      case 'rejected':
        return <WarningIcon />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !checklist) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/checklists')}>
          Back to Checklists
        </Button>
      </Box>
    );
  }

  if (!checklist) {
    return null;
  }

  const canSubmitForApproval = checklist.status === 'in_progress' && 
    checklist.completion_stats?.completion_percentage === 100;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" flexDirection={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "center" : "center"} gap={isMobile ? 2 : 0}>
          <Box sx={{ width: isMobile ? '100%' : 'auto' }}>
            <Box display="flex" alignItems="center" gap={1} sx={{ justifyContent: isMobile ? 'flex-start' : 'flex-start', mb: isMobile ? 1 : 0 }}>
              <IconButton onClick={() => navigate('/checklists')} sx={{ p: isMobile ? 0.5 : 1 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant={isMobile ? "h6" : "h5"}>Checklist</Typography>
            </Box>
            <Box sx={{ px: isMobile ? 2 : 0 }}>
              <Typography variant={isMobile ? "h5" : "h4"} gutterBottom sx={{ textAlign: isMobile ? 'center' : 'left' }}>
                {checklist.template_name || `Checklist #${checklist.id}`}
              </Typography>
              <Typography variant={isMobile ? "body2" : "subtitle1"} color="text.secondary" sx={{ textAlign: isMobile ? 'center' : 'left' }}>
                {checklist.property_name} - {checklist.property_address}
              </Typography>
            </Box>
          </Box>
          <Stack direction={isMobile ? "column" : "row"} spacing={1} sx={{ width: isMobile ? '100%' : 'auto' }}>
            {isEditing && (
              <Button
                variant="outlined"
                startIcon={!isMobile ? <PersonIcon /> : undefined}
                onClick={() => {
                  loadUsers();
                  setAssignmentDialogOpen(true);
                }}
                size={isMobile ? "small" : "medium"}
                fullWidth={isMobile}
              >
                {isMobile ? "Assign" : "Assign User"}
              </Button>
            )}
            {isEditing && (
              <Button
                variant="outlined"
                startIcon={!isMobile ? <CalendarTodayIcon /> : undefined}
                onClick={() => setDueDateDialogOpen(true)}
                size={isMobile ? "small" : "medium"}
                fullWidth={isMobile}
              >
                {isMobile ? "Due Date" : "Edit Due Date"}
              </Button>
            )}
            {canSubmitForApproval && (
              <Button
                variant="contained"
                color="success"
                startIcon={!isMobile ? <SendIcon /> : undefined}
                onClick={handleSubmitForApproval}
                disabled={saving}
                size={isMobile ? "small" : "medium"}
                fullWidth={isMobile}
              >
                {isMobile ? "Complete" : "Mark as Complete"}
              </Button>
            )}
            {!isEditing && (checklist.status === 'in_progress' || checklist.status === 'pending') && (
              <Button
                variant="outlined"
                startIcon={!isMobile ? <EditIcon /> : undefined}
                onClick={() => {
                  navigate(`/checklists/${id}/edit`);
                  setIsEditing(true);
                }}
                size={isMobile ? "small" : "medium"}
                fullWidth={isMobile}
              >
                {isMobile ? "Edit" : "Edit Mode"}
              </Button>
            )}
            {isEditing && (
              <Button
                variant="outlined"
                startIcon={<CheckCircleIcon />}
                onClick={() => {
                  navigate(`/checklists/${id}`);
                  setIsEditing(false);
                }}
              >
                View Mode
              </Button>
            )}
          </Stack>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Status and Progress */}
        <Grid container spacing={isMobile ? 2 : 3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: isMobile ? 2 : 3 }}>
              <Stack spacing={3}>
                <Box display="flex" flexDirection={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "center" : "center"} gap={isMobile ? 1 : 0}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(checklist.status)}
                    <Typography variant={isMobile ? "body1" : "h6"}>
                      Status: {checklistService.formatStatus(checklist.status)}
                    </Typography>
                  </Box>
                  {checklist.due_date && (
                    <Chip
                      label={`Due: ${formatDate(checklist.due_date)}`}
                      color={checklistService.isOverdue(checklist) ? 'error' : 'default'}
                      size={isMobile ? "small" : "medium"}
                    />
                  )}
                </Box>
                
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Progress</Typography>
                    <Typography variant="body2">
                      {checklist.completion_stats?.completion_percentage || 0}% Complete
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={checklist.completion_stats?.completion_percentage || 0}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Stack>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="h6" gutterBottom sx={{ textAlign: isMobile ? 'center' : 'left' }}>
                Details
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Assigned To
                  </Typography>
                  <Typography variant="body2">
                    {checklist.assigned_to_email || 'Unassigned'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {formatDateTime(checklist.created_at)}
                  </Typography>
                </Box>
                {checklist.updated_at && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body2">
                      {formatDateTime(checklist.updated_at)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Checklist Items */}
        <Paper sx={{ p: isMobile ? 1 : 3 }}>
          <Typography variant="h6" gutterBottom sx={{ px: isMobile ? 1 : 0, textAlign: isMobile ? 'center' : 'left' }}>
            Checklist Items
          </Typography>
          <List sx={{ p: 0 }}>
            {checklist.items?.map((item, index) => {
              const isExpanded = expandedItems.has(item.id);
              const itemUpdate = itemUpdates.get(item.id);
              const hasChanges = itemUpdate && (
                (item.response_id && itemUpdate.status === 'pending') ||
                (!item.response_id && itemUpdate.status === 'completed') ||
                itemUpdate.notes !== (item.notes || '')
              );
              
              return (
                <React.Fragment key={item.id}>
                  {index > 0 && <Divider />}
                  <ListItem sx={{ px: isMobile ? 1 : 2 }}>
                    <ListItemIcon sx={{ minWidth: isMobile ? 36 : 56 }}>
                      <Checkbox
                        checked={itemUpdate?.status === 'completed'}
                        onChange={() => handleItemToggle(item)}
                        disabled={!isEditing || (checklist.status !== 'in_progress' && checklist.status !== 'pending') || saving}
                        size={isMobile ? "small" : "medium"}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            variant="body1"
                            sx={{
                              textDecoration: itemUpdate?.status === 'completed' ? 'line-through' : 'none'
                            }}
                          >
                            {item.item_text || item.title || `Item ${index + 1}`}
                          </Typography>
                          {item.is_required && (
                            <Chip label="Required" size="small" color="error" />
                          )}
                        </Box>
                      }
                      secondary={item.description}
                    />
                    {!isMobile && (
                      <ListItemSecondaryAction>
                        <Stack direction="row" spacing={1}>
                          {hasChanges && isEditing && (
                            <Tooltip title="Save Changes">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleSaveItem(item)}
                                disabled={saving}
                              >
                                <SaveIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Comments">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCommentDialog(item);
                              }}
                            >
                              <CommentIcon />
                            </IconButton>
                          </Tooltip>
                          {item.item_type === 'photo' || item.item_type === 'file_upload' ? (
                            <>
                              <Tooltip title="Take Photo">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPhotoItemId(item.id);
                                      setCameraDialogOpen(true);
                                    }}
                                    disabled={!isEditing}
                                    color="primary"
                                  >
                                    <CameraAltIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              {item.item_type === 'file_upload' && (
                                <Tooltip title="Attach File">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedItemId(item.id);
                                        setUploadDialogOpen(true);
                                      }}
                                      disabled={!isEditing}
                                    >
                                      <AttachFileIcon />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                            </>
                          ) : item.item_type !== 'checkbox' && item.item_type !== 'text' && item.item_type !== 'signature' ? (
                            <Tooltip title="Attach File">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItemId(item.id);
                                    setUploadDialogOpen(true);
                                  }}
                                  disabled={!isEditing}
                                >
                                  <AttachFileIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : null}
                          <IconButton
                            size="small"
                            onClick={(e) => toggleItemExpanded(item.id, e)}
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Stack>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                  
                  {/* Mobile Action Buttons */}
                  {isMobile && (
                    <Box sx={{ px: 2, pb: 1 }}>
                      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ gap: 0.5 }}>
                        {hasChanges && isEditing && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => handleSaveItem(item)}
                            disabled={saving}
                            startIcon={<SaveIcon />}
                          >
                            Save
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCommentDialog(item);
                          }}
                          startIcon={<CommentIcon />}
                        >
                          Comment
                        </Button>
                        {item.item_type === 'photo' || (isMobile && item.item_type === 'file_upload') ? (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhotoItemId(item.id);
                                setCameraDialogOpen(true);
                              }}
                              disabled={!isEditing}
                              color="primary"
                              startIcon={<CameraAltIcon />}
                            >
                              Photo
                            </Button>
                            {item.item_type === 'file_upload' && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  setUploadDialogOpen(true);
                                }}
                                disabled={!isEditing}
                                startIcon={<AttachFileIcon />}
                              >
                                File
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemId(item.id);
                              setUploadDialogOpen(true);
                            }}
                            disabled={!isEditing}
                            startIcon={<AttachFileIcon />}
                          >
                            File
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => toggleItemExpanded(item.id, e)}
                          startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        >
                          {isExpanded ? "Less" : "More"}
                        </Button>
                      </Stack>
                    </Box>
                  )}
                  
                  <Collapse in={isExpanded}>
                    <Box sx={{ pl: isMobile ? 2 : 7, pr: 2, pb: 2 }}>
                      <Stack spacing={2}>
                        {isEditing && (
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Notes"
                            value={itemUpdate?.notes || ''}
                            onChange={(e) => handleItemNotesChange(item.id, e.target.value)}
                            disabled={checklist.status !== 'in_progress' && checklist.status !== 'pending'}
                          />
                        )}
                        {!isEditing && item.notes && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Notes
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.notes}
                            </Typography>
                          </Box>
                        )}
                        {item.completed_at && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Completed
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDateTime(item.completed_at)} by {item.completed_by_email}
                            </Typography>
                          </Box>
                        )}
                        {item.attachments && item.attachments.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Attachments ({item.attachments.length})
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              {item.attachments.map((attachment) => (
                                <Chip
                                  key={attachment.id}
                                  label={attachment.file_name}
                                  size="small"
                                  icon={<AttachFileIcon />}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // Handle file viewing with authentication
                                    try {
                                      const token = localStorage.getItem('token');
                                      const response = await fetch(`/api/checklists/attachments/${attachment.id}/download`, {
                                        headers: {
                                          'Authorization': `Bearer ${token}`
                                        }
                                      });
                                      
                                      if (!response.ok) {
                                        throw new Error('Failed to load file');
                                      }
                                      
                                      // Create a blob from the response
                                      const blob = await response.blob();
                                      
                                      // Create a temporary URL for the blob
                                      const url = window.URL.createObjectURL(blob);
                                      
                                      // Open in new tab
                                      const newTab = window.open(url, '_blank');
                                      
                                      // Clean up the blob URL after a delay to ensure the new tab has loaded
                                      if (newTab) {
                                        // For PDFs and images, the browser will display them inline
                                        // For other files, it will prompt to download
                                        setTimeout(() => {
                                          window.URL.revokeObjectURL(url);
                                        }, 1000);
                                      } else {
                                        // If popup was blocked, fall back to download
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = attachment.file_name;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);
                                        setError('Popup blocked. File downloaded instead.');
                                      }
                                    } catch (error) {
                                      console.error('Error viewing file:', error);
                                      setError('Failed to view file');
                                    }
                                  }}
                                />
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  </Collapse>
                </React.Fragment>
              );
            })}
          </List>
        </Paper>

        {/* Comment Dialog */}
        {checklist && selectedItemId && (
          <ChecklistCommentDialog
            open={commentDialogOpen}
            onClose={handleCloseCommentDialog}
            checklistId={checklist.id}
            itemId={selectedItemId}
            itemText={selectedItemText}
          />
        )}

        {/* File Upload Dialog */}
        <Dialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>Attach File</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Upload files related to this checklist item. Supported formats: Images, PDF, Documents, Spreadsheets (Max 10MB)
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </Button>
              {selectedFile && (
                <Alert severity="info">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setUploadDialogOpen(false);
              setSelectedFile(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleFileUpload}
              variant="contained"
              disabled={!selectedFile || uploading}
            >
              {uploading ? <CircularProgress size={20} /> : 'Upload'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assignment Dialog */}
        <Dialog
          open={assignmentDialogOpen}
          onClose={() => setAssignmentDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>Assign Checklist</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Assign this checklist to a user for completion.
              </Typography>
              <Autocomplete
                options={users}
                getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.email})`}
                value={users.find(u => u.id === selectedUserId) || null}
                onChange={(_, newValue) => setSelectedUserId(newValue?.id || null)}
                loading={loadingUsers}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select User"
                    variant="outlined"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAssignUser}
              variant="contained"
              disabled={selectedUserId === null || saving}
            >
              {saving ? <CircularProgress size={20} /> : 'Assign'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Due Date Dialog */}
        <Dialog
          open={dueDateDialogOpen}
          onClose={() => setDueDateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>Edit Due Date</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Set or update the due date for this checklist.
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Due Date"
                  value={selectedDueDate}
                  onChange={(newValue) => setSelectedDueDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: 'outlined'
                    }
                  }}
                />
              </LocalizationProvider>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDueDateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleUpdateDueDate}
              variant="contained"
              disabled={saving}
            >
              {saving ? <CircularProgress size={20} /> : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Mobile Camera Capture Dialog */}
        <MobileCameraCapture
          open={cameraDialogOpen}
          onCapture={handleCameraCapture}
          onCancel={() => {
            setCameraDialogOpen(false);
            setSelectedPhotoItemId(null);
          }}
          uploading={uploading}
        />
      </Stack>
    </Box>
  );
};

export default ChecklistDetail;
