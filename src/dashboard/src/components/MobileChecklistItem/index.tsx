import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Checkbox,
  Chip,
  IconButton,
  Button,
  Stack,
  Collapse,
  Divider,
  useTheme,
  useMediaQuery,
  Avatar,
  Badge,
  LinearProgress,
  Fade,
  Grow
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Comment as CommentIcon,
  CameraAlt as CameraAltIcon,
  AttachFile as AttachFileIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Notes as NotesIcon
} from '@mui/icons-material';

export interface MobileChecklistItemProps {
  item: {
    id: number;
    item_text?: string;
    title?: string;
    description?: string;
    is_required?: boolean;
    item_type?: string;
    notes?: string;
    response_id?: number;
    attachments?: Array<{
      id: number;
      filename: string;
      file_type: string;
    }>;
    comments?: Array<{
      id: number;
      comment_text: string;
      created_at: string;
    }>;
  };
  completed: boolean;
  hasChanges?: boolean;
  disabled?: boolean;
  isEditing?: boolean;
  notes?: string;
  onToggle: () => void;
  onSave?: () => void;
  onOpenCamera?: () => void;
  onOpenFileUpload?: () => void;
  onOpenComments?: () => void;
  onNotesChange?: (notes: string) => void;
}

export const MobileChecklistItem: React.FC<MobileChecklistItemProps> = ({
  item,
  completed,
  hasChanges = false,
  disabled = false,
  isEditing = false,
  notes = '',
  onToggle,
  onSave,
  onOpenCamera,
  onOpenFileUpload,
  onOpenComments,
  onNotesChange
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expanded, setExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  if (!isMobile) {
    // Return null or basic version for desktop
    return null;
  }

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  const handleCheckboxChange = () => {
    if (!disabled) {
      onToggle();
    }
  };

  const itemTitle = item.item_text || item.title || `Item ${item.id}`;
  const hasAttachments = item.attachments && item.attachments.length > 0;
  const hasComments = item.comments && item.comments.length > 0;
  const requiresPhoto = item.item_type === 'photo';
  const requiresFile = item.item_type === 'file_upload';

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 3,
        overflow: 'visible',
        boxShadow: completed 
          ? `0 2px 8px ${theme.palette.success.main}20`
          : theme.shadows[2],
        border: completed 
          ? `2px solid ${theme.palette.success.main}40`
          : hasChanges 
            ? `2px solid ${theme.palette.warning.main}40`
            : `1px solid ${theme.palette.divider}`,
        transition: theme.transitions.create(['box-shadow', 'border-color', 'transform'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:active': {
          transform: 'scale(0.98)',
        }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Main Item Row */}
        <Box display="flex" alignItems="flex-start" gap={2}>
          {/* Large Touch-Friendly Checkbox */}
          <Box
            sx={{
              position: 'relative',
              minWidth: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
              backgroundColor: completed 
                ? `${theme.palette.success.main}15`
                : theme.palette.background.default,
              border: `2px solid ${completed ? theme.palette.success.main : theme.palette.divider}`,
              transition: theme.transitions.create(['background-color', 'border-color'], {
                duration: theme.transitions.duration.shorter,
              }),
            }}
            onClick={handleCheckboxChange}
          >
            <Checkbox
              checked={completed}
              onChange={() => {}} // Handled by parent onClick
              disabled={disabled}
              icon={<UncheckedIcon sx={{ fontSize: 28 }} />}
              checkedIcon={<CheckCircleIcon sx={{ fontSize: 28 }} />}
              sx={{
                padding: 0,
                '& .MuiSvgIcon-root': {
                  fontSize: 28,
                },
                '&.Mui-checked': {
                  color: theme.palette.success.main,
                }
              }}
            />
          </Box>

          {/* Item Content */}
          <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="flex-start" justifyContent="space-between">
              <Box flex={1} minWidth={0}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    textDecoration: completed ? 'line-through' : 'none',
                    color: completed ? theme.palette.text.secondary : theme.palette.text.primary,
                    lineHeight: 1.3,
                    mb: 0.5
                  }}
                >
                  {itemTitle}
                </Typography>

                {/* Status Chips */}
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                  {item.is_required && (
                    <Chip 
                      label="Required" 
                      size="small" 
                      color="error" 
                      variant="outlined"
                      sx={{ height: 24, fontSize: '0.75rem' }}
                    />
                  )}
                  {completed && (
                    <Chip 
                      label="Complete" 
                      size="small" 
                      color="success" 
                      variant="filled"
                      sx={{ height: 24, fontSize: '0.75rem' }}
                    />
                  )}
                  {hasChanges && (
                    <Chip 
                      label="Unsaved" 
                      size="small" 
                      color="warning" 
                      variant="outlined"
                      sx={{ height: 24, fontSize: '0.75rem' }}
                    />
                  )}
                </Stack>

                {/* Description */}
                {item.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ 
                      lineHeight: 1.4,
                      mb: 1,
                      display: expanded ? 'block' : '-webkit-box',
                      WebkitLineClamp: expanded ? 'unset' : 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {item.description}
                  </Typography>
                )}
              </Box>

              {/* Expand Button */}
              <IconButton
                size="small"
                onClick={handleToggleExpanded}
                sx={{ 
                  ml: 1,
                  minWidth: 40,
                  height: 40,
                  backgroundColor: theme.palette.action.hover,
                  '&:hover': {
                    backgroundColor: theme.palette.action.selected,
                  }
                }}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            {/* Quick Action Indicators */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              {hasComments && (
                <Badge badgeContent={item.comments?.length} color="primary">
                  <CommentIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                </Badge>
              )}
              {hasAttachments && (
                <Badge badgeContent={item.attachments?.length} color="secondary">
                  <AttachFileIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                </Badge>
              )}
              {requiresPhoto && (
                <CameraAltIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
              )}
              {requiresFile && (
                <AttachFileIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
              )}
            </Stack>
          </Box>
        </Box>

        {/* Expanded Content */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />

            {/* Action Buttons */}
            <Stack spacing={2}>
              {/* Primary Actions */}
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {hasChanges && isEditing && onSave && (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<SaveIcon />}
                    onClick={onSave}
                    sx={{ 
                      minHeight: 48,
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Save Changes
                  </Button>
                )}
                
                {onOpenComments && (
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<CommentIcon />}
                    onClick={onOpenComments}
                    sx={{ 
                      minHeight: 48,
                      borderRadius: 3,
                      textTransform: 'none'
                    }}
                  >
                    Comments {hasComments && `(${item.comments?.length})`}
                  </Button>
                )}
              </Stack>

              {/* Media Actions */}
              {(requiresPhoto || requiresFile || onOpenCamera || onOpenFileUpload) && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {(requiresPhoto || onOpenCamera) && (
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<CameraAltIcon />}
                      onClick={onOpenCamera}
                      disabled={!isEditing}
                      sx={{ 
                        minHeight: 48,
                        borderRadius: 3,
                        textTransform: 'none',
                        flex: 1
                      }}
                    >
                      Take Photo
                    </Button>
                  )}
                  
                  {(requiresFile || onOpenFileUpload) && (
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<AttachFileIcon />}
                      onClick={onOpenFileUpload}
                      disabled={!isEditing}
                      sx={{ 
                        minHeight: 48,
                        borderRadius: 3,
                        textTransform: 'none',
                        flex: 1
                      }}
                    >
                      Upload File
                    </Button>
                  )}
                </Stack>
              )}

              {/* Notes Section */}
              {isEditing && onNotesChange && (
                <Box>
                  <Button
                    variant="text"
                    startIcon={<NotesIcon />}
                    onClick={() => setShowNotes(!showNotes)}
                    sx={{ 
                      mb: 1,
                      textTransform: 'none',
                      justifyContent: 'flex-start'
                    }}
                  >
                    {showNotes ? 'Hide Notes' : 'Add Notes'}
                  </Button>
                  
                  <Collapse in={showNotes}>
                    <textarea
                      value={notes}
                      onChange={(e) => onNotesChange(e.target.value)}
                      placeholder="Add notes for this item..."
                      style={{
                        width: '100%',
                        minHeight: 80,
                        padding: theme.spacing(1.5),
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: theme.spacing(1),
                        fontSize: '14px',
                        fontFamily: theme.typography.body2.fontFamily,
                        resize: 'vertical',
                        backgroundColor: theme.palette.background.default,
                        color: theme.palette.text.primary
                      }}
                    />
                  </Collapse>
                </Box>
              )}

              {/* Existing Notes Display */}
              {item.notes && (
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: theme.palette.background.default,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Notes:
                  </Typography>
                  <Typography variant="body2">
                    {item.notes}
                  </Typography>
                </Box>
              )}

              {/* Attachments Preview */}
              {hasAttachments && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Attachments ({item.attachments?.length})
                  </Typography>
                  <Stack spacing={1}>
                    {item.attachments?.map((attachment) => (
                      <Box
                        key={attachment.id}
                        sx={{
                          p: 1.5,
                          backgroundColor: theme.palette.background.default,
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <AttachFileIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {attachment.filename}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default MobileChecklistItem;