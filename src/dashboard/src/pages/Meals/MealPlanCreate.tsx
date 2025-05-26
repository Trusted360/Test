import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Select, 
  FormHelperText,
  CircularProgress, 
  Divider,
  Chip,
  FormControlLabel,
  Switch,
  SelectChangeEvent,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import MealPlanService from '../../services/mealPlan.service';
import HouseholdGroupService, { HouseholdGroup } from '../../services/householdGroup.service';
import { useAuth } from '../../context/AuthContext';

const MealPlanCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const householdId = user?.member?.id || '';

  const [name, setName] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(
    new Date(new Date().setDate(new Date().getDate() + 6))
  );
  const [useGroups, setUseGroups] = useState<boolean>(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<HouseholdGroup[]>([]);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [groupsLoading, setGroupsLoading] = useState<boolean>(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  useEffect(() => {
    if (householdId) {
      fetchGroups();
    }
  }, [householdId]);

  const fetchGroups = async (): Promise<void> => {
    try {
      setGroupsLoading(true);
      const fetchedGroups = await HouseholdGroupService.getGroups(householdId);
      setGroups(fetchedGroups);
      setGroupsError(null);
    } catch (err) {
      console.error('Error fetching household groups:', err);
      setGroupsError('Failed to load household groups. Group selection will not be available.');
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleCreateMealPlan = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      setError('Please select valid start and end dates.');
      return;
    }
    
    if (startDate > endDate) {
      setError('End date must be after start date.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const newMealPlan = await MealPlanService.createMealPlan({
        name,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'draft'
      });
      
      // If using groups, associate the meal plan with the selected groups
      if (useGroups && selectedGroupIds.length > 0) {
        await Promise.all(
          selectedGroupIds.map(groupId => 
            HouseholdGroupService.associateMealPlanWithGroup(newMealPlan.id, groupId)
          )
        );
      }
      
      navigate(`/meals/${newMealPlan.id}`);
    } catch (err) {
      console.error('Error creating meal plan:', err);
      setError('Failed to create meal plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelectionChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedGroupIds(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Create Meal Plan
      </Typography>
      
      <Paper sx={{ p: 3, mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleCreateMealPlan}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Meal Plan Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                margin="normal"
                helperText="Give your meal plan a descriptive name"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      margin: 'normal',
                      fullWidth: true,
                      required: true
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{
                    textField: {
                      margin: 'normal',
                      fullWidth: true,
                      required: true
                    }
                  }}
                  minDate={startDate || undefined}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Chip label="Group Selection" />
              </Divider>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={useGroups} 
                    onChange={(e) => {
                      setUseGroups(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedGroupIds([]);
                      }
                    }}
                  />
                }
                label="Create plan for specific household groups"
              />
              <FormHelperText>
                Enable this to create a meal plan targeted at specific groups in your household
              </FormHelperText>
            </Grid>
            
            {useGroups && (
              <Grid item xs={12}>
                {groupsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : groupsError ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {groupsError}
                  </Alert>
                ) : groups.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No household groups found. Please create groups first in the Settings section.
                  </Alert>
                ) : (
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Select Groups</InputLabel>
                    <Select
                      multiple
                      value={selectedGroupIds}
                      onChange={handleGroupSelectionChange}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const group = groups.find(g => g.id === value);
                            return (
                              <Chip key={value} label={group?.name || value} />
                            );
                          })}
                        </Box>
                      )}
                      required={useGroups}
                      disabled={groups.length === 0}
                    >
                      {groups.map((group) => (
                        <MenuItem key={group.id} value={group.id}>
                          {group.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Select the groups this meal plan is intended for
                    </FormHelperText>
                  </FormControl>
                )}
              </Grid>
            )}
            
            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/meals')} 
                sx={{ mr: 2 }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={loading || (useGroups && selectedGroupIds.length === 0 && groups.length > 0)}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Meal Plan'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default MealPlanCreate; 