import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Grid,
  styled
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import GroupIcon from '@mui/icons-material/Group';
import MealPlanService, { MealPlan } from '../../services/mealPlan.service';
import HouseholdGroupService, { MealPlanGroup } from '../../services/householdGroup.service';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
  marginBottom: theme.spacing(3),
}));

const StatusChip = styled(Chip)<{ status: string }>(({ theme, status }) => {
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

const MealPlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [mealPlanGroups, setMealPlanGroups] = useState<MealPlanGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [groupsLoading, setGroupsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchMealPlan();
      fetchMealPlanGroups();
    }
  }, [id]);

  const fetchMealPlan = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await MealPlanService.getMealPlan(id!);
      setMealPlan(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching meal plan:', err);
      setError('Failed to load meal plan. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMealPlanGroups = async (): Promise<void> => {
    try {
      setGroupsLoading(true);
      const groups = await HouseholdGroupService.getMealPlanGroups(id!);
      setMealPlanGroups(groups);
      setGroupsError(null);
    } catch (err) {
      console.error('Error fetching meal plan groups:', err);
      setGroupsError('Failed to load meal plan groups.');
    } finally {
      setGroupsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusLabel = (status: string, approvalStatus?: string): string => {
    if (status === 'draft') return 'Draft';
    if (status === 'active' && approvalStatus === 'pending') return 'Pending Approval';
    if (status === 'active' && approvalStatus === 'approved') return 'Approved';
    if (status === 'active' && approvalStatus === 'rejected') return 'Rejected';
    if (status === 'active' && approvalStatus === 'finalized') return 'Finalized';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusIcon = (status: string, approvalStatus?: string) => {
    if (status === 'draft') return null;
    if (approvalStatus === 'pending') return <HourglassEmptyIcon />;
    if (approvalStatus === 'approved' || approvalStatus === 'finalized') return <CheckCircleIcon />;
    return null;
  };

  // Group meal plan items by day
  const getItemsByDay = (): Record<string, typeof mealPlan.items> => {
    if (!mealPlan || !mealPlan.items) return {};
    
    const itemsByDay: Record<string, typeof mealPlan.items> = {};
    
    mealPlan.items.forEach(item => {
      const day = item.planned_date;
      if (!itemsByDay[day]) {
        itemsByDay[day] = [];
      }
      itemsByDay[day].push(item);
    });
    
    return itemsByDay;
  };
  
  // Sort meal types in the correct order
  const sortMealTypes = (items: typeof mealPlan.items): typeof mealPlan.items => {
    if (!items) return [];
    
    const mealTypeOrder = {
      breakfast: 1,
      lunch: 2,
      dinner: 3,
      snack: 4
    };
    
    return [...items].sort((a, b) => {
      return mealTypeOrder[a.meal_type as keyof typeof mealTypeOrder] - 
             mealTypeOrder[b.meal_type as keyof typeof mealTypeOrder];
    });
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Meal Plan Detail
        </Typography>
        <Box>
          {mealPlan?.status === 'draft' && (
            <Button 
              variant="outlined" 
              startIcon={<EditIcon />}
              onClick={() => navigate(`/meals/${id}/edit`)} 
              sx={{ mr: 2 }}
            >
              Edit
            </Button>
          )}
          {mealPlan?.status === 'draft' && (
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<SendIcon />}
              onClick={() => navigate(`/meals/${id}/submit`)}
            >
              Submit for Approval
            </Button>
          )}
          {mealPlan?.approval_status === 'pending' && (
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate(`/meals/${id}/approve`)}
            >
              Review & Approve
            </Button>
          )}
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : mealPlan ? (
        <>
          <StyledPaper>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                {mealPlan.name}
              </Typography>
              <StatusChip 
                label={getStatusLabel(mealPlan.status, mealPlan.approval_status)}
                status={mealPlan.approval_status || mealPlan.status}
                icon={getStatusIcon(mealPlan.status, mealPlan.approval_status)}
              />
            </Box>
            <Typography variant="body1">
              {formatDate(mealPlan.start_date)} - {formatDate(mealPlan.end_date)}
            </Typography>
            
            {/* Group information */}
            {!groupsLoading && mealPlanGroups.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Group-specific meal plan for:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {mealPlanGroups.map(group => (
                    <Chip 
                      key={group.id}
                      icon={<GroupIcon />}
                      label={group.group_name || 'Unknown Group'} 
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {mealPlan.approval_status === 'pending' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                This meal plan is awaiting approval from household members.
              </Alert>
            )}
            
            {mealPlan.approval_status === 'rejected' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This meal plan was rejected. Please review the feedback and create a new version.
              </Alert>
            )}
            
            {mealPlan.approval_status === 'approved' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                This meal plan has been approved and is ready to use.
              </Alert>
            )}
          </StyledPaper>
          
          <Typography variant="h6" gutterBottom>
            Meals
          </Typography>
          
          {Object.entries(getItemsByDay()).map(([day, items]) => (
            <StyledPaper key={day}>
              <Typography variant="subtitle1" gutterBottom>
                {formatDate(day)}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {sortMealTypes(items).map(item => (
                  <Grid item xs={12} sm={6} md={4} key={item.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6" component="div">
                            {item.recipe_title}
                          </Typography>
                          <Chip 
                            label={item.meal_type.charAt(0).toUpperCase() + item.meal_type.slice(1)} 
                            size="small" 
                            color="secondary"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {item.servings} serving(s)
                        </Typography>
                        {item.recipe_description && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {item.recipe_description}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </StyledPaper>
          ))}
        </>
      ) : (
        <Alert severity="info">No meal plan found.</Alert>
      )}
    </Box>
  );
};

export default MealPlanDetail; 