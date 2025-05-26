import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  styled, 
  Button, 
  Grid, 
  CircularProgress, 
  Card, 
  CardContent, 
  CardActions, 
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';
import MealPlanService, { MealPlan } from '../../services/mealPlan.service';
import HouseholdGroupService, { HouseholdGroup } from '../../services/householdGroup.service';
import { useAuth } from '../../context/AuthContext';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
}));

interface StatusChipProps {
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'finalized' | string;
}

const StatusChip = styled(Chip)<StatusChipProps>(({ theme, status }) => {
  const statusColors = {
    draft: { bg: theme.palette.grey[200], color: theme.palette.text.primary },
    pending: { bg: theme.palette.warning.light, color: theme.palette.warning.contrastText },
    approved: { bg: theme.palette.success.light, color: theme.palette.success.contrastText },
    rejected: { bg: theme.palette.error.light, color: theme.palette.error.contrastText },
    finalized: { bg: theme.palette.primary.light, color: theme.palette.primary.contrastText },
  };

  return {
    backgroundColor: statusColors[status as keyof typeof statusColors]?.bg || theme.palette.grey[200],
    color: statusColors[status as keyof typeof statusColors]?.color || theme.palette.text.primary,
    fontWeight: 500,
  };
});

const Meals: React.FC = () => {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [filteredMealPlans, setFilteredMealPlans] = useState<MealPlan[]>([]);
  const [groups, setGroups] = useState<HouseholdGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [groupsLoading, setGroupsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const householdId = user?.member?.id || '';

  useEffect(() => {
    fetchMealPlans();
    if (householdId) {
      fetchGroups();
    }
  }, [householdId]);

  useEffect(() => {
    if (selectedGroupId && selectedGroupId !== 'all') {
      fetchMealPlansByGroup(selectedGroupId);
    } else {
      setFilteredMealPlans(mealPlans);
    }
  }, [selectedGroupId, mealPlans]);

  const fetchMealPlans = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await MealPlanService.getAllMealPlans();
      setMealPlans(response);
      setFilteredMealPlans(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching meal plans:', err);
      setError('Failed to load meal plans. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async (): Promise<void> => {
    try {
      setGroupsLoading(true);
      const fetchedGroups = await HouseholdGroupService.getGroups(householdId);
      setGroups(fetchedGroups);
      setGroupsError(null);
    } catch (err) {
      console.error('Error fetching household groups:', err);
      setGroupsError('Failed to load household groups. Group filtering will not be available.');
    } finally {
      setGroupsLoading(false);
    }
  };

  const fetchMealPlansByGroup = async (groupId: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await MealPlanService.getMealPlansByGroup(groupId);
      setFilteredMealPlans(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching meal plans by group:', err);
      setError('Failed to filter meal plans by group.');
      setFilteredMealPlans(mealPlans); // Fallback to all meal plans
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMealPlan = (): void => {
    navigate('/meals/create');
  };

  const handleGroupFilterChange = (event: SelectChangeEvent): void => {
    setSelectedGroupId(event.target.value);
  };

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusLabel = (status: string, approvalStatus?: string): string => {
    if (status === 'draft') return 'Draft';
    if (status === 'active' && approvalStatus === 'pending') return 'Pending Approval';
    if (status === 'active' && approvalStatus === 'approved') return 'Approved';
    if (status === 'active' && approvalStatus === 'rejected') return 'Rejected';
    if (status === 'active' && approvalStatus === 'finalized') return 'Finalized';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Meal Planning
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleCreateMealPlan}
        >
          Create Meal Plan
        </Button>
      </Box>
      
      {/* Group filter */}
      {!groupsLoading && groups.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="group-filter-label">
              <FilterListIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
              Filter by Group
            </InputLabel>
            <Select
              labelId="group-filter-label"
              value={selectedGroupId}
              onChange={handleGroupFilterChange}
              label="Filter by Group"
              size="small"
            >
              <MenuItem value="all">All Meal Plans</MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <StyledPaper elevation={2}>
          <Typography color="error">{error}</Typography>
        </StyledPaper>
      ) : filteredMealPlans.length === 0 ? (
        <StyledPaper elevation={2}>
          <Typography variant="h6" gutterBottom>
            No Meal Plans
          </Typography>
          <Typography variant="body2" paragraph>
            {selectedGroupId && selectedGroupId !== 'all' 
              ? "No meal plans found for the selected group."
              : "You don't have any meal plans yet. Create your first meal plan to get started."}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateMealPlan}
          >
            Create Meal Plan
          </Button>
        </StyledPaper>
      ) : (
        <Grid container spacing={3}>
          {filteredMealPlans.map((mealPlan) => (
            <Grid item xs={12} md={6} lg={4} key={mealPlan.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" component="div">
                      {mealPlan.name}
                    </Typography>
                    <StatusChip 
                      label={getStatusLabel(mealPlan.status, mealPlan.approval_status)} 
                      status={mealPlan.approval_status || mealPlan.status}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {formatDate(mealPlan.start_date)} - {formatDate(mealPlan.end_date)}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => navigate(`/meals/${mealPlan.id}`)}
                  >
                    View Details
                  </Button>
                  {mealPlan.status === 'draft' && (
                    <Button 
                      size="small" 
                      color="primary"
                      onClick={() => navigate(`/meals/${mealPlan.id}/submit`)}
                    >
                      Submit for Approval
                    </Button>
                  )}
                  {mealPlan.approval_status === 'pending' && (
                    <Button 
                      size="small" 
                      color="primary"
                      onClick={() => navigate(`/meals/${mealPlan.id}/approve`)}
                    >
                      Review & Approve
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Meals; 