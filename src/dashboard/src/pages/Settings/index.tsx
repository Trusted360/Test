import React, { useState } from 'react';
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
  FormControlLabel
} from '@mui/material';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
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
  
  // Facility settings
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  
  // Notification settings
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [auditReminders, setAuditReminders] = useState(true);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to the backend
    console.log('Saving settings:', { 
      facilityName, 
      facilityAddress, 
      emailAlerts, 
      smsAlerts, 
      auditReminders 
    });
    
    // Simulating API call
    setTimeout(() => {
      setSaveSuccess(true);
    }, 500);
  };

  const handleCloseSnackbar = () => {
    setSaveSuccess(false);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your facility settings and preferences.
      </Typography>

      <StyledPaper elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="Facility" id="settings-tab-0" aria-controls="settings-tabpanel-0" />
            <Tab label="Notifications" id="settings-tab-1" aria-controls="settings-tabpanel-1" />
            <Tab label="Account" id="settings-tab-2" aria-controls="settings-tabpanel-2" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Facility Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Facility Name"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="Enter facility name"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Facility Address"
                value={facilityAddress}
                onChange={(e) => setFacilityAddress(e.target.value)}
                placeholder="Enter facility address"
              />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Notification Preferences
          </Typography>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                />
              }
              label="Email alerts for security incidents"
            />
          </Box>
          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                />
              }
              label="SMS alerts for critical incidents"
            />
          </Box>
          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={auditReminders}
                  onChange={(e) => setAuditReminders(e.target.checked)}
                />
              }
              label="Audit reminder notifications"
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Account Settings
          </Typography>
          <Typography variant="body2">
            Account management features are under development.
          </Typography>
        </TabPanel>

        {(tabValue === 0 || tabValue === 1) && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSaveSettings}
            >
              Save Settings
            </Button>
          </Box>
        )}
      </StyledPaper>

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
    </Box>
  );
};

export default Settings; 