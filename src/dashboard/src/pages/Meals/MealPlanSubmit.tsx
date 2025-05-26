import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  styled
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MealPlanService, { MealPlan } from '../../services/mealPlan.service';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
  marginBottom: theme.spacing(3),
}));

const MealPlanSubmit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchMealPlan();
    }
  }, [id]);

  const fetchMealPlan = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await MealPlanService.getMealPlan(id!);
      
      if (data.status !== 'draft') {
        setError(`This meal plan cannot be submitted because it is in ${data.status} status.`);
      } else {
        setMealPlan(data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching meal plan:', err);
      setError('Failed to load meal plan. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      await MealPlanService.submitForApproval(id!);
      setSubmitSuccess(true);
      
      // Redirect after successful submission
      setTimeout(() => {
        navigate(`/meals/${id}`);
      }, 2000);
    } catch (err) {
      console.error('Error submitting meal plan for approval:', err);
      setSubmitError('Failed to submit meal plan for approval. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
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
      <Typography variant="h4" component="h1" gutterBottom>
        Submit Meal Plan for Approval
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : mealPlan ? (
        <>
          <StyledPaper>
            <Typography variant="h5" gutterBottom>
              {mealPlan.name}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {formatDate(mealPlan.start_date)} - {formatDate(mealPlan.end_date)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Submitting this meal plan will send it to all household members for review and approval.
              Once submitted, the meal plan will be locked for editing until the approval process is complete.
            </Typography>
          </StyledPaper>
          
          <Typography variant="h6" gutterBottom>
            Meal Plan Overview
          </Typography>
          
          {Object.entries(getItemsByDay()).map(([day, items]) => (
            <StyledPaper key={day}>
              <Typography variant="subtitle1" gutterBottom>
                {formatDate(day)}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List>
                {sortMealTypes(items).map(item => (
                  <ListItem key={item.id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip 
                            label={item.meal_type.charAt(0).toUpperCase() + item.meal_type.slice(1)} 
                            size="small" 
                            color="secondary"
                            sx={{ mr: 2 }}
                          />
                          <Typography variant="body1">
                            {item.recipe_title}
                          </Typography>
                        </Box>
                      }
                      secondary={item.servings > 1 ? `${item.servings} servings` : '1 serving'}
                    />
                  </ListItem>
                ))}
              </List>
            </StyledPaper>
          ))}
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              onClick={() => navigate(`/meals/${id}`)} 
              sx={{ mr: 2 }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={submitting || submitSuccess}
            >
              {submitting ? <CircularProgress size={24} /> : 'Submit for Approval'}
            </Button>
          </Box>
          
          {submitError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          )}
          
          {submitSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Meal plan has been submitted for approval. Redirecting...
            </Alert>
          )}
        </>
      ) : (
        <Alert severity="info">No meal plan found.</Alert>
      )}
    </Box>
  );
};

export default MealPlanSubmit; 