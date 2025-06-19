import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  Alert as MuiAlert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Badge,
  Tooltip,
  Tab,
  Tabs,
  Snackbar,
  Switch
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  WaterDrop as WaterDropIcon,
  Security as SecurityIcon,
  DoorFront as DoorFrontIcon,
  LocalFireDepartment as FireIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
  Pets as PetsIcon,
  Timeline as TimelineIcon,
  NotificationImportant as NotificationIcon
} from '@mui/icons-material';
import { videoService, Alert } from '../../services/video.service';
import { checklistService } from '../../services/checklist.service';
import { format } from 'date-fns';

interface VideoFeed {
  id: number;
  camera_id: number;
  camera_name: string;
  property_name: string;
  location: string;
  event_type: string;
  event_description: string;
  severity: string;
  timestamp: string;
  video_url?: string;
  thumbnail_url?: string;
  duration: number;
  ai_confidence: number;
  status: 'reviewing' | 'resolved';
  actions_taken?: string[];
}

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
      id={`video-tabpanel-${index}`}
      aria-labelledby={`video-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Convert API alerts to VideoFeed format for display
const convertAlertsToVideoFeeds = (alerts: Alert[]): VideoFeed[] => {
  return alerts.map(alert => ({
    id: alert.id,
    camera_id: alert.camera_id,
    camera_name: alert.camera_name || 'Unknown Camera',
    property_name: alert.property_name || 'Unknown Property',
    location: alert.alert_data_json?.camera_location || 'Unknown Location',
    event_type: alert.alert_type_name?.toLowerCase().replace(/\s+/g, '_') || 'unknown_event',
    event_description: alert.alert_data_json?.description || 'No description available',
    severity: alert.severity,
    timestamp: alert.created_at,
    thumbnail_url: alert.alert_data_json?.image_snapshot_path || "/api/placeholder/320/180",
    duration: alert.alert_data_json?.duration || 60,
    ai_confidence: alert.alert_data_json?.ai_confidence || 0.85,
    status: alert.status === 'resolved' ? 'resolved' : 'reviewing',
    actions_taken: alert.alert_data_json?.actions_taken || []
  }));
};

const VideoAnalysis: React.FC = () => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [videoFeeds, setVideoFeeds] = useState<VideoFeed[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeed, setSelectedFeed] = useState<VideoFeed | null>(null);
  const [feedDialogOpen, setFeedDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [alertSettingsDialogOpen, setAlertSettingsDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]);
  const [alertSettings, setAlertSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    criticalOnly: false,
    eventTypes: {
      suspicious_activity: true,
      water_leak: true,
      door_left_open: true,
      fire_alarm: true,
      vehicle_accident: true,
      person_detected: false,
      animal_detected: false
    }
  });
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'maintenance',
    assignedTo: '',
    dueDate: ''
  });
  const [checklistForm, setChecklistForm] = useState({
    templateId: '',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [camerasResponse, alertsResponse, statsResponse, templatesResponse] = await Promise.all([
        videoService.getCameras(),
        videoService.getAlerts({ limit: 50 }),
        videoService.getStats(),
        checklistService.getTemplates()
      ]);

      setCameras(camerasResponse.data);
      setAlerts(alertsResponse.data);
      setStats(statsResponse.data);
      
      // Convert alerts to video feeds format for display
      const convertedFeeds = convertAlertsToVideoFeeds(alertsResponse.data);
      setVideoFeeds(convertedFeeds);
      
      console.log('Templates response:', templatesResponse);
      setChecklistTemplates(templatesResponse.data || []);
    } catch (err: any) {
      console.error('Error loading video data:', err);
      setError(err.message || 'Failed to load video analysis data');
      
      // Fallback to empty data if API fails
      setCameras([]);
      setAlerts([]);
      setVideoFeeds([]);
      setStats({ total_alerts: 0, active_alerts: 0, resolved_alerts: 0, alerts_today: 0 });
      setChecklistTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load checklist templates based on event type
  const getRelevantTemplates = (eventType: string) => {
    // Filter for video event response templates only
    return checklistTemplates.filter(t => 
      t.is_active !== false && 
      t.name && t.name.startsWith('Video Event Response')
    );
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'suspicious_activity':
        return <SecurityIcon />;
      case 'water_leak':
        return <WaterDropIcon />;
      case 'door_left_open':
        return <DoorFrontIcon />;
      case 'fire_alarm':
        return <FireIcon />;
      case 'person_detected':
        return <PersonIcon />;
      case 'vehicle_accident':
        return <CarIcon />;
      case 'animal_detected':
        return <PetsIcon />;
      default:
        return <WarningIcon />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'suspicious_activity':
        return '#ff9800';
      case 'water_leak':
        return '#2196f3';
      case 'door_left_open':
        return '#9c27b0';
      case 'fire_alarm':
        return '#f44336';
      case 'vehicle_accident':
        return '#ff5722';
      default:
        return '#757575';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reviewing': return 'warning';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  const handleViewFeed = (feed: VideoFeed) => {
    setSelectedFeed(feed);
    setFeedDialogOpen(true);
  };

  const handleOpenChecklistDialog = (feed: VideoFeed) => {
    setSelectedFeed(feed);
    console.log('All templates:', checklistTemplates);
    const relevantTemplates = getRelevantTemplates(feed.event_type);
    console.log('Relevant templates:', relevantTemplates);
    if (relevantTemplates.length > 0) {
      setChecklistForm({ 
        templateId: relevantTemplates[0].id.toString(), 
        notes: `Generated from video event: ${feed.event_type.replace(/_/g, ' ')} at ${feed.location}` 
      });
    } else {
      setChecklistForm({ templateId: '', notes: '' });
    }
    setChecklistDialogOpen(true);
  };

  const handleCreateChecklist = async () => {
    if (!selectedFeed || !checklistForm.templateId) return;
    
    try {
      const checklistData = {
        property_id: 1, // In real app, would come from feed data
        template_id: parseInt(checklistForm.templateId),
        notes: checklistForm.notes || `Generated from video event: ${selectedFeed.event_description}`
      };
      
      // Create checklist from template
      const response = await checklistService.createChecklist({
        property_id: checklistData.property_id,
        template_id: checklistData.template_id
      });
      
      // Add to actions taken
      const updatedFeeds = videoFeeds.map(f => 
        f.id === selectedFeed.id 
          ? { ...f, actions_taken: [...(f.actions_taken || []), 'Checklist created'] }
          : f
      );
      setVideoFeeds(updatedFeeds);
      
      setSnackbar({ open: true, message: 'Checklist created successfully!', severity: 'success' });
      setChecklistDialogOpen(false);
    } catch (err) {
      console.error('Error creating checklist:', err);
      setSnackbar({ open: true, message: 'Failed to create checklist', severity: 'error' });
    }
  };

  const handleOpenTicketDialog = (feed: VideoFeed) => {
    setSelectedFeed(feed);
    setTicketForm({
      title: `${feed.event_type.replace(/_/g, ' ')} - ${feed.location}`,
      description: feed.event_description,
      priority: feed.severity === 'critical' ? 'high' : feed.severity === 'high' ? 'high' : 'medium',
      category: feed.event_type === 'water_leak' ? 'plumbing' : 
                feed.event_type === 'fire_alarm' ? 'safety' :
                feed.event_type === 'door_left_open' ? 'security' : 'maintenance',
      assignedTo: '',
      dueDate: feed.severity === 'critical' ? 
        new Date(Date.now() + 4 * 3600000).toISOString().split('T')[0] : // 4 hours for critical
        new Date(Date.now() + 24 * 3600000).toISOString().split('T')[0] // 24 hours for others
    });
    setTicketDialogOpen(true);
  };

  const handleCreateServiceTicket = async () => {
    if (!selectedFeed) return;
    
    try {
      const ticketData = {
        ...ticketForm,
        property_id: 1, // In real app, would come from feed data
        alert_id: selectedFeed.id
      };
      
      const response = await videoService.createServiceTicket(ticketData);
      const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
      
      // Add to actions taken
      const updatedFeeds = videoFeeds.map(f => 
        f.id === selectedFeed.id 
          ? { ...f, actions_taken: [...(f.actions_taken || []), `Service ticket created: ${ticketNumber}`] }
          : f
      );
      setVideoFeeds(updatedFeeds);
      
      setSnackbar({ 
        open: true, 
        message: `Service ticket created successfully! Ticket #${ticketNumber}`, 
        severity: 'success' 
      });
      setTicketDialogOpen(false);
    } catch (err) {
      console.error('Error creating service ticket:', err);
      setSnackbar({ open: true, message: 'Failed to create service ticket', severity: 'error' });
    }
  };

  const handleResolveEvent = async (feed: VideoFeed) => {
    try {
      const updatedFeeds = videoFeeds.map(f => 
        f.id === feed.id ? { ...f, status: 'resolved' as const } : f
      );
      setVideoFeeds(updatedFeeds);
      setSnackbar({ open: true, message: 'Event marked as resolved', severity: 'success' });
      setFeedDialogOpen(false);
    } catch (err) {
      console.error('Error resolving event:', err);
    }
  };

  const handleUnresolveEvent = async (feed: VideoFeed) => {
    try {
      const updatedFeeds = videoFeeds.map(f => 
        f.id === feed.id ? { ...f, status: 'reviewing' as const } : f
      );
      setVideoFeeds(updatedFeeds);
      setSnackbar({ open: true, message: 'Event reopened for review', severity: 'info' });
    } catch (err) {
      console.error('Error unresolving event:', err);
    }
  };

  const handleAlertSettings = () => {
    setAlertSettingsDialogOpen(true);
  };

  const handleSaveAlertSettings = async () => {
    try {
      // In a real app, this would save to the backend
      setSnackbar({ open: true, message: 'Alert settings saved successfully!', severity: 'success' });
      setAlertSettingsDialogOpen(false);
    } catch (err) {
      console.error('Error saving alert settings:', err);
      setSnackbar({ open: true, message: 'Failed to save alert settings', severity: 'error' });
    }
  };

  const filteredFeeds = videoFeeds.filter(feed => {
    if (filterSeverity !== 'all' && feed.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && feed.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Video Analysis & Monitoring
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<NotificationIcon />}
            onClick={() => handleAlertSettings()}
            color="primary"
          >
            Alert Settings
          </Button>
        </Box>
      </Box>

      {error && (
        <MuiAlert severity="error" sx={{ mb: 3 }}>
          {error}
        </MuiAlert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <WarningIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Events
                  </Typography>
                  <Typography variant="h5">
                    {stats?.active_alerts || videoFeeds.filter(f => f.status === 'reviewing').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TimelineIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Under Review
                  </Typography>
                  <Typography variant="h5">
                    {stats?.active_alerts || videoFeeds.filter(f => f.status === 'reviewing').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircleIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Resolved Today
                  </Typography>
                  <Typography variant="h5">
                    {stats?.alerts_today || videoFeeds.filter(f => f.status === 'resolved').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <VideocamIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Cameras
                  </Typography>
                  <Typography variant="h5">
                    {cameras.filter((c: any) => c.status === 'active').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content with Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="video analysis tabs">
            <Tab label="Recent Events" />
            <Tab label="Live Cameras" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* Filters */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={filterSeverity}
                label="Severity"
                onChange={(e) => setFilterSeverity(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="reviewing">Reviewing</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Event Feed Grid */}
          <Grid container spacing={3}>
            {filteredFeeds.map((feed) => (
              <Grid item xs={12} md={6} lg={4} key={feed.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component="div"
                    sx={{
                      height: 180,
                      bgcolor: 'grey.300',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        display: 'flex',
                        gap: 1
                      }}
                    >
                      <Chip
                        label={feed.severity}
                        size="small"
                        color={getSeverityColor(feed.severity) as any}
                      />
                      <Chip
                        label={feed.status}
                        size="small"
                        color={getStatusColor(feed.status) as any}
                      />
                    </Box>
                    <IconButton
                      sx={{
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                      }}
                      onClick={() => handleViewFeed(feed)}
                    >
                      <PlayIcon fontSize="large" />
                    </IconButton>
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        bgcolor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem'
                      }}
                    >
                      {Math.floor(feed.duration / 60)}:{(feed.duration % 60).toString().padStart(2, '0')}
                    </Box>
                  </CardMedia>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Box
                        sx={{
                          bgcolor: getEventColor(feed.event_type),
                          color: 'white',
                          p: 0.5,
                          borderRadius: 1,
                          mr: 1
                        }}
                      >
                        {getEventIcon(feed.event_type)}
                      </Box>
                      <Box flex={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {feed.event_type.replace(/_/g, ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {format(new Date(feed.timestamp), 'MMM d, h:mm a')}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {/* Property Information - Prominently displayed */}
                    <Box sx={{ mb: 1, p: 1, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                      <Typography variant="body2" fontWeight="bold" color="primary.main">
                        Property: {feed.property_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {feed.camera_name} • {feed.location}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {feed.event_description}
                    </Typography>
                  </CardContent>
                  <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewFeed(feed)}
                      fullWidth
                    >
                      Review
                    </Button>
                    {feed.status === 'reviewing' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => handleResolveEvent(feed)}
                      >
                        Resolve
                      </Button>
                    )}
                    {feed.status === 'resolved' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => handleUnresolveEvent(feed)}
                      >
                        Reopen
                      </Button>
                    )}
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Live Cameras Grid */}
          <Grid container spacing={3}>
            {cameras.map((camera: any) => (
              <Grid item xs={12} sm={6} md={4} key={camera.id}>
                <Card>
                  <CardMedia
                    component="div"
                    sx={{
                      height: 200,
                      bgcolor: 'grey.300',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    <VideocamIcon sx={{ fontSize: 60, color: 'grey.500' }} />
                    <Chip
                      label={camera.status}
                      color={camera.status === 'active' ? 'success' : 'default'}
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  </CardMedia>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {camera.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {camera.property_name} • {camera.location}
                    </Typography>
                    {camera.active_alerts > 0 && (
                      <Box mt={1}>
                        <Chip
                          label={`${camera.active_alerts} active alerts`}
                          color="error"
                          size="small"
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Analytics Dashboard */}
          <Typography variant="h6" gutterBottom>
            Event Analytics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Events by Type (Last 7 Days)
                  </Typography>
                  <List>
                    {['suspicious_activity', 'water_leak', 'door_left_open', 'fire_alarm'].map((type) => {
                      const count = videoFeeds.filter(f => f.event_type === type).length;
                      return (
                        <ListItem key={type}>
                          <ListItemIcon>
                            {getEventIcon(type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={type.replace(/_/g, ' ').toUpperCase()}
                            secondary={`${count} events`}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Response Time Metrics
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Average Response Time"
                        secondary="12 minutes"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Critical Event Response"
                        secondary="5 minutes"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Resolution Rate"
                        secondary="94%"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Event Detail Dialog */}
      <Dialog
        open={feedDialogOpen}
        onClose={() => setFeedDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Box
              sx={{
                bgcolor: selectedFeed ? getEventColor(selectedFeed.event_type) : 'grey',
                color: 'white',
                p: 0.5,
                borderRadius: 1,
                mr: 2
              }}
            >
              {selectedFeed && getEventIcon(selectedFeed.event_type)}
            </Box>
            Event Details
          </Box>
        </DialogTitle>
        <DialogContent sx={{ overflow: 'auto' }}>
          {selectedFeed && (
            <Box>
              <Box
                sx={{
                  bgcolor: 'grey.300',
                  height: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 3,
                  borderRadius: 1
                }}
              >
                <IconButton
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                  }}
                >
                  <PlayIcon fontSize="large" />
                </IconButton>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Property
                  </Typography>
                  <Typography variant="body1" gutterBottom fontWeight="bold" color="primary.main">
                    {selectedFeed.property_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Event Type
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedFeed.event_type.replace(/_/g, ' ').toUpperCase()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Severity
                  </Typography>
                  <Chip
                    label={selectedFeed.severity}
                    color={getSeverityColor(selectedFeed.severity) as any}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Camera
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedFeed.camera_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Location
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedFeed.location}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Time
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {format(new Date(selectedFeed.timestamp), 'MMM d, yyyy h:mm a')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    AI Confidence
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {(selectedFeed.ai_confidence * 100).toFixed(0)}%
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedFeed.event_description}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Available Actions
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  startIcon={<AssignmentIcon />}
                  onClick={() => handleOpenChecklistDialog(selectedFeed)}
                  disabled={selectedFeed.status === 'resolved'}
                >
                  Create Checklist
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<BuildIcon />}
                  onClick={() => handleOpenTicketDialog(selectedFeed)}
                  disabled={selectedFeed.status === 'resolved'}
                >
                  Create Service Ticket
                </Button>
                {selectedFeed.status !== 'resolved' && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleResolveEvent(selectedFeed)}
                  >
                    Mark as Resolved
                  </Button>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Checklist Creation Dialog */}
      <Dialog
        open={checklistDialogOpen}
        onClose={() => setChecklistDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Checklist from Event</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedFeed && (
              <MuiAlert severity="info" sx={{ mb: 2 }}>
                Creating checklist for: <strong>{selectedFeed.event_type.replace(/_/g, ' ')}</strong> event at {selectedFeed.location}
              </MuiAlert>
            )}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Checklist Template</InputLabel>
              <Select
                value={checklistForm.templateId}
                label="Checklist Template"
                onChange={(e) => setChecklistForm({ ...checklistForm, templateId: e.target.value })}
              >
                {getRelevantTemplates(selectedFeed?.event_type || '').length === 0 ? (
                  <MenuItem disabled>No templates available</MenuItem>
                ) : (
                  getRelevantTemplates(selectedFeed?.event_type || '').map((template) => (
                    <MenuItem key={template.id} value={template.id.toString()}>
                      <Box>
                        <Typography variant="body1">
                          {template.name}
                        </Typography>
                        {template.description && (
                          <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5 }}>
                            {template.description}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Additional Notes"
              value={checklistForm.notes}
              onChange={(e) => setChecklistForm({ ...checklistForm, notes: e.target.value })}
              placeholder="Add any additional context or instructions..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChecklistDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateChecklist} 
            variant="contained"
            disabled={!checklistForm.templateId}
          >
            Create Checklist
          </Button>
        </DialogActions>
      </Dialog>

      {/* Service Ticket Creation Dialog */}
      <Dialog
        open={ticketDialogOpen}
        onClose={() => setTicketDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Service Ticket</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={ticketForm.title}
              onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={ticketForm.description}
              onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={ticketForm.priority}
                    label="Priority"
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={ticketForm.category}
                    label="Category"
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                  >
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="plumbing">Plumbing</MenuItem>
                    <MenuItem value="electrical">Electrical</MenuItem>
                    <MenuItem value="security">Security</MenuItem>
                    <MenuItem value="safety">Safety</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Assigned To"
                  value={ticketForm.assignedTo}
                  onChange={(e) => setTicketForm({ ...ticketForm, assignedTo: e.target.value })}
                  placeholder="Email or name..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Due Date"
                  value={ticketForm.dueDate}
                  onChange={(e) => setTicketForm({ ...ticketForm, dueDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTicketDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateServiceTicket} 
            variant="contained"
            disabled={!ticketForm.title || !ticketForm.description}
          >
            Create Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Settings Dialog */}
      <Dialog
        open={alertSettingsDialogOpen}
        onClose={() => setAlertSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Alert Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Notification Preferences
            </Typography>
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography>Email Notifications</Typography>
                  <Switch
                    checked={alertSettings.emailNotifications}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlertSettings({ ...alertSettings, emailNotifications: e.target.checked })}
                  />
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography>SMS Notifications</Typography>
                  <Switch
                    checked={alertSettings.smsNotifications}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlertSettings({ ...alertSettings, smsNotifications: e.target.checked })}
                  />
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography>Push Notifications</Typography>
                  <Switch
                    checked={alertSettings.pushNotifications}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlertSettings({ ...alertSettings, pushNotifications: e.target.checked })}
                  />
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography>Critical Events Only</Typography>
                  <Switch
                    checked={alertSettings.criticalOnly}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlertSettings({ ...alertSettings, criticalOnly: e.target.checked })}
                  />
                </Box>
              </Stack>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Event Type Alerts
            </Typography>
            <FormControl component="fieldset">
              <Stack spacing={2}>
                {Object.entries(alertSettings.eventTypes).map(([eventType, enabled]) => (
                  <Box key={eventType} display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                      {getEventIcon(eventType)}
                      <Typography sx={{ ml: 2 }}>
                        {eventType.replace(/_/g, ' ').charAt(0).toUpperCase() + eventType.replace(/_/g, ' ').slice(1)}
                      </Typography>
                    </Box>
                    <Switch
                      checked={enabled}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlertSettings({
                        ...alertSettings,
                        eventTypes: {
                          ...alertSettings.eventTypes,
                          [eventType]: e.target.checked
                        }
                      })}
                      disabled={alertSettings.criticalOnly}
                    />
                  </Box>
                ))}
              </Stack>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertSettingsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveAlertSettings} variant="contained">
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default VideoAnalysis;
