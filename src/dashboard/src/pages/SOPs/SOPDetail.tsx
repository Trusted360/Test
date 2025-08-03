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
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  PlayArrow as PlayArrowIcon,
  Description as DocumentIcon,
  List as StructuredIcon,
  Assignment as AssignmentIcon,
  Transform as ConvertIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CloudUpload as CloudUploadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import {
  SOPTemplate as SOPDocument,
  SOPItem
} from '../../types/sop.types';
import { sopService } from '../../services/sop.service';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sop-detail-tabpanel-${index}`}
      aria-labelledby={`sop-detail-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SOPDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [sop, setSOP] = useState<SOPDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadSOP();
    }
  }, [id]);

  const loadSOP = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sopService.getSOPTemplateById(Number(id));
      setSOP(response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load SOP');
      console.error('Error loading SOP:', err);
    } finally {
      setLoading(false);
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

  if (error && !sop) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/sops')}>
          Back to SOPs
        </Button>
      </Box>
    );
  }

  if (!sop) {
    return null;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" flexDirection={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "stretch" : "center"} gap={isMobile ? 2 : 0}>
          <Box sx={{ width: isMobile ? '100%' : 'auto' }}>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: isMobile ? 1 : 0 }}>
              <IconButton onClick={() => navigate('/sops')} sx={{ p: isMobile ? 0.5 : 1 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant={isMobile ? "h6" : "h5"}>SOP Details</Typography>
            </Box>
            <Box sx={{ px: isMobile ? 2 : 0 }}>
              <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                <StructuredIcon />
                <Typography variant={isMobile ? "h5" : "h4"} gutterBottom sx={{ mb: 0 }}>
                  {sop.name}
                </Typography>
              </Box>
              <Typography variant={isMobile ? "body2" : "subtitle1"} color="text.secondary">
                {sop.description || 'No description provided'}
              </Typography>
            </Box>
          </Box>
          <Stack direction={isMobile ? "column" : "row"} spacing={1} sx={{ width: isMobile ? '100%' : 'auto' }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/sops/${id}/edit`)}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
            >
              Edit
            </Button>
          </Stack>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* SOP Info Card */}
        <Paper sx={{ p: isMobile ? 2 : 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Stack spacing={2}>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  <Chip
                    label={sopService.formatCategory(sop.category)}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label={sop.is_active ? 'Active' : 'Inactive'}
                    color={sop.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {formatDateTime(sop.created_at)}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* Items List */}
        <Paper sx={{ width: '100%', p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" gutterBottom>
                SOP Items ({sop.items?.length || 0})
              </Typography>
              
              {sop.items && sop.items.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {sop.items.map((item, index) => (
                      <React.Fragment key={item.id}>
                        {index > 0 && <Divider />}
                        <ListItem sx={{ px: isMobile ? 1 : 2 }}>
                          <ListItemIcon sx={{ minWidth: isMobile ? 36 : 56 }}>
                            <Typography variant="body2" color="text.secondary">
                              {item.sort_order + 1}.
                            </Typography>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body1">
                                  {item.item_text}
                                </Typography>
                                {item.is_required && (
                                  <Chip label="Required" size="small" color="error" />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                  ))}
                </List>
              ) : (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No items defined for this SOP.
                  </Typography>
                </Paper>
              )}
            </Stack>
        </Paper>
      </Stack>
    </Box>
  );
};

export default SOPDetail;