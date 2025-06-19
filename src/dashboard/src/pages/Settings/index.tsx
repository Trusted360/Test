import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  styled, 
  Tabs, 
  Tab,
  Button,
  Snackbar,
  Alert,
  TextField,
  Grid,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Slider,
  Card,
  CardContent,
  CardHeader,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

import settingsService, { 
  GlobalSettings, 
  UserSettings, 
  NotificationTarget, 
  ServiceIntegration, 
  CameraFeedSettings,
  Property
} from '../../services/settingsService';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Global Settings State
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({});
  
  // User Settings State
  const [userSettings, setUserSettings] = useState<UserSettings>({});
  
  // Notification Targets State
  const [notificationTargets, setNotificationTargets] = useState<NotificationTarget[]>([]);
  const [notificationDialog, setNotificationDialog] = useState(false);
  const [editingNotification, setEditingNotification] = useState<NotificationTarget | null>(null);
  
  // Service Integrations State
  const [serviceIntegrations, setServiceIntegrations] = useState<ServiceIntegration[]>([]);
  const [integrationDialog, setIntegrationDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<ServiceIntegration | null>(null);
  
  // Camera Feed Settings State
  const [cameraFeedSettings, setCameraFeedSettings] = useState<CameraFeedSettings[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);

  // Form states for dialogs
  const [notificationForm, setNotificationForm] = useState({
    name: '',
    type: 'email' as 'email' | 'sms' | 'webhook' | 'slack',
    target_address: '',
    is_active: true
  });

  const [integrationForm, setIntegrationForm] = useState({
    name: '',
    integration_type: 'jira' as 'jira' | 'servicenow' | 'zendesk' | 'freshservice',
    base_url: '',
    api_key: '',
    username: '',
    auto_create_tickets: false,
    default_project_key: '',
    default_issue_type: '',
    is_active: true
  });

  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    setLoading(true);
    try {
      const [global, user, notifications, integrations, cameraSettings, props, cams] = await Promise.all([
        settingsService.getGlobalSettings(),
        settingsService.getUserSettings(),
        settingsService.getNotificationTargets(),
        settingsService.getServiceIntegrations(),
        settingsService.getCameraFeedSettings(),
        settingsService.getProperties(),
        settingsService.getCameras()
      ]);

      setGlobalSettings(global);
      setUserSettings(user);
      setNotificationTargets(notifications);
      setServiceIntegrations(integrations);
      setCameraFeedSettings(cameraSettings);
      setProperties(props);
      setCameras(cams);
    } catch (err) {
      setError('Failed to load settings');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveGlobalSettings = async () => {
    try {
      await settingsService.updateGlobalSettings(globalSettings);
      setSaveSuccess(true);
    } catch (err) {
      setError('Failed to save global settings');
    }
  };

  const handleSaveUserSettings = async () => {
    try {
      await settingsService.updateUserSettings(userSettings);
      setSaveSuccess(true);
    } catch (err) {
      setError('Failed to save user settings');
    }
  };

  const handleGlobalSettingChange = (key: string, value: any, type?: 'string' | 'number' | 'boolean' | 'json') => {
    setGlobalSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value,
        type: type || prev[key]?.type || 'string',
        category: prev[key]?.category || 'general'
      }
    }));
  };

  const handleUserSettingChange = (key: string, value: any) => {
    setUserSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Notification Target handlers
  const handleCreateNotificationTarget = async () => {
    try {
      const newTarget = await settingsService.createNotificationTarget(notificationForm);
      setNotificationTargets(prev => [...prev, newTarget]);
      setNotificationDialog(false);
      resetNotificationForm();
      setSaveSuccess(true);
    } catch (err) {
      setError('Failed to create notification target');
    }
  };

  const handleUpdateNotificationTarget = async () => {
    if (!editingNotification) return;
    
    try {
      const updated = await settingsService.updateNotificationTarget(editingNotification.id, notificationForm);
      setNotificationTargets(prev => prev.map(t => t.id === updated.id ? updated : t));
      setNotificationDialog(false);
      setEditingNotification(null);
      resetNotificationForm();
      setSaveSuccess(true);
    } catch (err) {
      setError('Failed to update notification target');
    }
  };

  const handleDeleteNotificationTarget = async (id: number) => {
    try {
      await settingsService.deleteNotificationTarget(id);
      setNotificationTargets(prev => prev.filter(t => t.id !== id));
      setSaveSuccess(true);
    } catch (err) {
      setError('Failed to delete notification target');
    }
  };

  const resetNotificationForm = () => {
    setNotificationForm({
      name: '',
      type: 'email',
      target_address: '',
      is_active: true
    });
  };

  const openNotificationDialog = (target?: NotificationTarget) => {
    if (target) {
      setEditingNotification(target);
      setNotificationForm({
        name: target.name,
        type: target.type,
        target_address: target.target_address,
        is_active: target.is_active
      });
    } else {
      setEditingNotification(null);
      resetNotificationForm();
    }
    setNotificationDialog(true);
  };

  // Service Integration handlers
  const handleCreateServiceIntegration = async () => {
    try {
      const newIntegration = await settingsService.createServiceIntegration(integrationForm);
      setServiceIntegrations(prev => [...prev, newIntegration]);
      setIntegrationDialog(false);
      resetIntegrationForm();
      setSaveSuccess(true);
    } catch (err) {
      setError('Failed to create service integration');
    }
  };

  const handleUpdateServiceIntegration = async () => {
    if (!editingIntegration) return;
    
    try {
      const updated = await settingsService.updateServiceIntegration(editingIntegration.id, integrationForm);
      setServiceIntegrations(prev => prev.map(i => i.id === updated.id ? updated : i));
      setIntegrationDialog(false);
      setEditingIntegration(null);
      resetIntegrationForm();
      setSaveSuccess(true);
    } catch (err) {
      setError('Failed to update service integration');
    }
  };

  const handleDeleteServiceIntegration = async (id: number) => {
    try {
      await settingsService.deleteServiceIntegration(id);
      setServiceIntegrations(prev => prev.filter(i => i.id !== id));
      setSaveSuccess(true);
    } catch (err) {
      setError('Failed to delete service integration');
    }
  };

  const resetIntegrationForm = () => {
    setIntegrationForm({
      name: '',
      integration_type: 'jira',
      base_url: '',
      api_key: '',
      username: '',
      auto_create_tickets: false,
      default_project_key: '',
      default_issue_type: '',
      is_active: true
    });
  };

  const openIntegrationDialog = (integration?: ServiceIntegration) => {
    if (integration) {
      setEditingIntegration(integration);
      setIntegrationForm({
        name: integration.name,
        integration_type: integration.integration_type,
        base_url: integration.base_url,
        api_key: '', // Don't populate for security
        username: integration.username || '',
        auto_create_tickets: integration.auto_create_tickets,
        default_project_key: integration.default_project_key || '',
        default_issue_type: integration.default_issue_type || '',
        is_active: integration.is_active
      });
    } else {
      setEditingIntegration(null);
      resetIntegrationForm();
    }
    setIntegrationDialog(true);
  };

  const handleCameraSettingChange = async (cameraFeedId: number, settings: Partial<CameraFeedSettings>) => {
    try {
      const updated = await settingsService.updateCameraFeedSettings(cameraFeedId, settings);
      setCameraFeedSettings(prev => prev.map(c => c.camera_feed_id === cameraFeedId ? updated : c));
      setSaveSuccess(true);
    } catch (err) {
      setError('Failed to update camera settings');
    }
  };

  const handleCloseSnackbar = () => {
    setSaveSuccess(false);
    setError(null);
  };

  if (loading) {
    return (
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Typography>Loading settings...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage system settings, user preferences, and integrations.
      </Typography>

      <StyledPaper elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="Global Settings" />
            <Tab label="User Preferences" />
            <Tab label="Notifications" />
            <Tab label="Service Integrations" />
            <Tab label="Camera Settings" />
          </Tabs>
        </Box>

        {/* Global Settings Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Global System Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            These settings apply to all users in your organization.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Organization Name"
                value={globalSettings.organization_name?.value || ''}
                onChange={(e) => handleGlobalSettingChange('organization_name', e.target.value)}
                placeholder="Enter organization name"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Support Email"
                value={globalSettings.support_email?.value || ''}
                onChange={(e) => handleGlobalSettingChange('support_email', e.target.value)}
                placeholder="support@yourcompany.com"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={globalSettings.email_notifications_enabled?.value || false}
                    onChange={(e) => handleGlobalSettingChange('email_notifications_enabled', e.target.checked, 'boolean')}
                  />
                }
                label="Enable Email Notifications"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={globalSettings.auto_create_tickets?.value || false}
                    onChange={(e) => handleGlobalSettingChange('auto_create_tickets', e.target.checked, 'boolean')}
                  />
                }
                label="Auto-create Service Tickets"
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSaveGlobalSettings}
              startIcon={<SaveIcon />}
            >
              Save Global Settings
            </Button>
          </Box>
        </TabPanel>

        {/* User Preferences Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            User Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Personal settings that apply only to your account.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userSettings.email_alerts || false}
                    onChange={(e) => handleUserSettingChange('email_alerts', e.target.checked)}
                  />
                }
                label="Email alerts for security incidents"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userSettings.sms_alerts || false}
                    onChange={(e) => handleUserSettingChange('sms_alerts', e.target.checked)}
                  />
                }
                label="SMS alerts for critical incidents"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userSettings.audit_reminders || false}
                    onChange={(e) => handleUserSettingChange('audit_reminders', e.target.checked)}
                  />
                }
                label="Audit reminder notifications"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Dashboard Theme</InputLabel>
                <Select
                  value={userSettings.theme || 'light'}
                  onChange={(e) => handleUserSettingChange('theme', e.target.value)}
                  label="Dashboard Theme"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="auto">Auto</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSaveUserSettings}
              startIcon={<SaveIcon />}
            >
              Save User Preferences
            </Button>
          </Box>
        </TabPanel>

        {/* Notification Targets Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Notification Targets
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openNotificationDialog()}
            >
              Add Target
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notificationTargets.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell>{target.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={target.type.toUpperCase()} 
                        size="small" 
                        color={target.type === 'email' ? 'primary' : target.type === 'sms' ? 'secondary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{target.target_address}</TableCell>
                    <TableCell>
                      <Chip 
                        label={target.is_active ? 'Active' : 'Inactive'} 
                        size="small" 
                        color={target.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => openNotificationDialog(target)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteNotificationTarget(target.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Service Integrations Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Service Ticket Integrations
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openIntegrationDialog()}
            >
              Add Integration
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Base URL</TableCell>
                  <TableCell>Auto-Create Tickets</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {serviceIntegrations.map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell>{integration.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={integration.integration_type.toUpperCase()} 
                        size="small" 
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>{integration.base_url}</TableCell>
                    <TableCell>
                      <Chip 
                        label={integration.auto_create_tickets ? 'Yes' : 'No'} 
                        size="small" 
                        color={integration.auto_create_tickets ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={integration.is_active ? 'Active' : 'Inactive'} 
                        size="small" 
                        color={integration.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => openIntegrationDialog(integration)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteServiceIntegration(integration.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Camera Settings Tab */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            Camera Feed Integration Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Configure camera feeds and assign them to properties for monitoring.
          </Typography>
          
          {cameraFeedSettings.map((camera) => (
            <StyledCard key={camera.camera_feed_id}>
              <CardHeader 
                title={camera.camera_name}
                subheader={`Location: ${camera.location} | Property: ${camera.property_name || 'Unassigned'}`}
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Assign to Property</InputLabel>
                      <Select
                        value={camera.property_id || ''}
                        onChange={(e) => handleCameraSettingChange(camera.camera_feed_id, { property_id: e.target.value as number })}
                        label="Assign to Property"
                      >
                        <MenuItem value="">Unassigned</MenuItem>
                        {properties.map((property) => (
                          <MenuItem key={property.id} value={property.id}>
                            {property.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                      Sensitivity Level: {camera.sensitivity_level}
                    </Typography>
                    <Slider
                      value={camera.sensitivity_level}
                      onChange={(_, value) => handleCameraSettingChange(camera.camera_feed_id, { sensitivity_level: value as number })}
                      min={1}
                      max={10}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={camera.motion_detection_enabled}
                          onChange={(e) => handleCameraSettingChange(camera.camera_feed_id, { motion_detection_enabled: e.target.checked })}
                        />
                      }
                      label="Motion Detection"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={camera.person_detection_enabled}
                          onChange={(e) => handleCameraSettingChange(camera.camera_feed_id, { person_detection_enabled: e.target.checked })}
                        />
                      }
                      label="Person Detection"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={camera.vehicle_detection_enabled}
                          onChange={(e) => handleCameraSettingChange(camera.camera_feed_id, { vehicle_detection_enabled: e.target.checked })}
                        />
                      }
                      label="Vehicle Detection"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>
          ))}
        </TabPanel>
      </StyledPaper>

      {/* Notification Target Dialog */}
      <Dialog open={notificationDialog} onClose={() => setNotificationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingNotification ? 'Edit Notification Target' : 'Add Notification Target'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={notificationForm.name}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={notificationForm.type}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, type: e.target.value as any }))}
                  label="Type"
                >
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="sms">SMS</MenuItem>
                  <MenuItem value="webhook">Webhook</MenuItem>
                  <MenuItem value="slack">Slack</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationForm.is_active}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={
                  notificationForm.type === 'email' ? 'Email Address' :
                  notificationForm.type === 'sms' ? 'Phone Number' :
                  notificationForm.type === 'webhook' ? 'Webhook URL' :
                  'Slack Channel/Webhook URL'
                }
                value={notificationForm.target_address}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, target_address: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotificationDialog(false)} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button 
            onClick={editingNotification ? handleUpdateNotificationTarget : handleCreateNotificationTarget}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            {editingNotification ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Service Integration Dialog */}
      <Dialog open={integrationDialog} onClose={() => setIntegrationDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIntegration ? 'Edit Service Integration' : 'Add Service Integration'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                value={integrationForm.name}
                onChange={(e) => setIntegrationForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Integration Type</InputLabel>
                <Select
                  value={integrationForm.integration_type}
                  onChange={(e) => setIntegrationForm(prev => ({ ...prev, integration_type: e.target.value as any }))}
                  label="Integration Type"
                >
                  <MenuItem value="jira">Jira</MenuItem>
                  <MenuItem value="servicenow">ServiceNow</MenuItem>
                  <MenuItem value="zendesk">Zendesk</MenuItem>
                  <MenuItem value="freshservice">Freshservice</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Base URL"
                value={integrationForm.base_url}
                onChange={(e) => setIntegrationForm(prev => ({ ...prev, base_url: e.target.value }))}
                placeholder="https://yourcompany.atlassian.net"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username"
                value={integrationForm.username}
                onChange={(e) => setIntegrationForm(prev => ({ ...prev, username: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="password"
                label="API Key"
                value={integrationForm.api_key}
                onChange={(e) => setIntegrationForm(prev => ({ ...prev, api_key: e.target.value }))}
                placeholder={editingIntegration ? "Leave blank to keep current" : "Enter API key"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Default Project Key"
                value={integrationForm.default_project_key}
                onChange={(e) => setIntegrationForm(prev => ({ ...prev, default_project_key: e.target.value }))}
                placeholder="PROJ"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Default Issue Type"
                value={integrationForm.default_issue_type}
                onChange={(e) => setIntegrationForm(prev => ({ ...prev, default_issue_type: e.target.value }))}
                placeholder="Task"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={integrationForm.auto_create_tickets}
                    onChange={(e) => setIntegrationForm(prev => ({ ...prev, auto_create_tickets: e.target.checked }))}
                  />
                }
                label="Auto-create Tickets"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={integrationForm.is_active}
                    onChange={(e) => setIntegrationForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIntegrationDialog(false)} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button 
            onClick={editingIntegration ? handleUpdateServiceIntegration : handleCreateServiceIntegration}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            {editingIntegration ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbars */}
      <Snackbar 
        open={saveSuccess} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          Settings saved successfully!
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
