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
  Alert
} from '@mui/material';
import { PreferenceForm, DietaryRestrictionInput } from '../../components/Preferences';
import { 
  Preference, 
  DietaryRestriction, 
  MealPlanConstraints 
} from '../../types/preferences';

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

// Mock household members - in a real app, these would come from an API
const MOCK_HOUSEHOLD_MEMBERS = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Doe' },
  { id: '3', name: 'Child Doe' }
];

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSavePreferences = () => {
    // In a real app, this would save to the backend
    console.log('Saving preferences:', { preferences, restrictions });
    
    const constraints: MealPlanConstraints = {
      preferences,
      dietaryRestrictions: restrictions
    };
    
    // Simulating API call
    setTimeout(() => {
      console.log('Saved constraints:', constraints);
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
        Manage your preferences and dietary restrictions.
      </Typography>

      <StyledPaper elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="Preferences" id="settings-tab-0" aria-controls="settings-tabpanel-0" />
            <Tab label="Dietary Restrictions" id="settings-tab-1" aria-controls="settings-tabpanel-1" />
            <Tab label="Account" id="settings-tab-2" aria-controls="settings-tabpanel-2" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <PreferenceForm
            initialPreferences={preferences}
            onChange={setPreferences}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <DietaryRestrictionInput
            restrictions={restrictions}
            onChange={setRestrictions}
            householdMembers={MOCK_HOUSEHOLD_MEMBERS}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Account Settings
          </Typography>
          <Typography variant="body2">
            Account settings page is under development. This is a placeholder page.
          </Typography>
        </TabPanel>

        {(tabValue === 0 || tabValue === 1) && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSavePreferences}
            >
              Save Preferences
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
          Preferences saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings; 