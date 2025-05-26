import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  Tooltip,
  LinearProgress,
  styled
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import MealPlanService, { 
  ApprovalDetails, 
  MealPlanItem, 
  ApprovalResponse 
} from '../../services/mealPlan.service';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
  marginBottom: theme.spacing(3),
}));

const MealPlanApproval: React.FC = () => {
  const { id, version = '1' } = useParams<{ id: string; version: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalDetails, setApprovalDetails] = useState<ApprovalDetails | null>(null);
  const [response, setResponse] = useState<'approved' | 'rejected' | 'partially_approved'>('approved');
  const [feedback, setFeedback] = useState<string>('');
  const [itemApprovals, setItemApprovals] = useState<Record<string, { 
    response: 'approved' | 'rejected', 
    feedback: string 
  }>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchApprovalDetails();
    }
  }, [id, version]);

  const fetchApprovalDetails = async (): Promise<void> => {
    try {
      setLoading(true);
      const details = await MealPlanService.getApprovalDetails(id!, parseInt(version));
      setApprovalDetails(details);
      
      // Initialize item approvals
      const initialItemApprovals: Record<string, { response: 'approved' | 'rejected', feedback: string }> = {};
      details.mealPlan.items?.forEach((item) => {
        initialItemApprovals[item.id] = { response: 'approved', feedback: '' };
      });
      setItemApprovals(initialItemApprovals);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching approval details:', err);
      setError('Failed to load meal plan approval details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setResponse(event.target.value as 'approved' | 'rejected' | 'partially_approved');
    
    // If switching to approved or rejected, update all item responses
    if (event.target.value === 'approved' || event.target.value === 'rejected') {
      const updatedItemApprovals = { ...itemApprovals };
      
      Object.keys(updatedItemApprovals).forEach((itemId) => {
        updatedItemApprovals[itemId] = { 
          ...updatedItemApprovals[itemId],
          response: event.target.value === 'approved' ? 'approved' : 'rejected'
        };
      });
      
      setItemApprovals(updatedItemApprovals);
    }
  };

  const handleItemResponseChange = (itemId: string, newResponse: 'approved' | 'rejected'): void => {
    setItemApprovals({
      ...itemApprovals,
      [itemId]: {
        ...itemApprovals[itemId],
        response: newResponse
      }
    });
    
    // If any item is rejected, automatically set the overall response to partially_approved
    if (newResponse === 'rejected') {
      setResponse('partially_approved');
    } else {
      // Check if all items are approved
      const allApproved = Object.values(itemApprovals)
        .every(item => item.response === 'approved');
      
      if (allApproved) {
        setResponse('approved');
      }
    }
  };

  const handleItemFeedbackChange = (itemId: string, newFeedback: string): void => {
    setItemApprovals({
      ...itemApprovals,
      [itemId]: {
        ...itemApprovals[itemId],
        feedback: newFeedback
      }
    });
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      
      // Format the response data
      const approvalResponse: ApprovalResponse = {
        response,
        feedback,
        itemApprovals: Object.entries(itemApprovals).map(([mealPlanItemId, approval]) => ({
          mealPlanItemId,
          response: approval.response,
          feedback: approval.feedback
        }))
      };
      
      await MealPlanService.submitApprovalResponse(id!, parseInt(version), approvalResponse);
      setSubmitSuccess(true);
      
      // Redirect after successful submission
      setTimeout(() => {
        navigate(`/meals/${id}`);
      }, 2000);
    } catch (err) {
      console.error('Error submitting approval:', err);
      setSubmitError('Failed to submit your approval. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getApprovalPercentage = (): number => {
    if (!approvalDetails) return 0;
    return approvalDetails.consensus.approvalPercentage;
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Meal Plan Approval
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : approvalDetails ? (
        <>
          <StyledPaper>
            <Typography variant="h5" gutterBottom>
              {approvalDetails.mealPlan.name}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body1">
                {formatDate(approvalDetails.mealPlan.start_date)} - {formatDate(approvalDetails.mealPlan.end_date)}
              </Typography>
              <Chip 
                label={`Version ${approvalDetails.version.version_number}`} 
                color="primary" 
                variant="outlined" 
                size="small" 
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Current Approval Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={getApprovalPercentage()}
                  sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {getApprovalPercentage()}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {approvalDetails.consensus.totalResponses} of {approvalDetails.consensus.totalMembers} household members have responded.
              </Typography>
            </Box>
          </StyledPaper>
          
          <StyledPaper>
            <Typography variant="h6" gutterBottom>
              Your Response
            </Typography>
            <RadioGroup
              name="approval-response"
              value={response}
              onChange={handleResponseChange}
              sx={{ mb: 2 }}
            >
              <FormControlLabel value="approved" control={<Radio />} label="Approve All" />
              <FormControlLabel value="rejected" control={<Radio />} label="Reject All" />
              <FormControlLabel value="partially_approved" control={<Radio />} label="Partially Approve" />
            </RadioGroup>
            
            <TextField
              label="Overall Feedback"
              multiline
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              fullWidth
              margin="normal"
            />
          </StyledPaper>
          
          <Typography variant="h6" gutterBottom>
            Meal Plan Items
          </Typography>
          
          <Grid container spacing={3}>
            {approvalDetails.mealPlan.items?.map((item: MealPlanItem) => (
              <Grid item xs={12} md={6} lg={4} key={item.id}>
                <Card>
                  {item.recipe_image_url && (
                    <CardMedia
                      component="img"
                      height="140"
                      image={item.recipe_image_url}
                      alt={item.recipe_title}
                    />
                  )}
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
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {formatDate(item.planned_date)} · {item.servings} serving(s)
                    </Typography>
                    {item.recipe_description && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {item.recipe_description}
                      </Typography>
                    )}
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ flexDirection: 'column', alignItems: 'flex-start', p: 2 }}>
                    <Box sx={{ display: 'flex', width: '100%', mb: 2 }}>
                      <Tooltip title="Approve this meal">
                        <Button 
                          variant={itemApprovals[item.id]?.response === 'approved' ? 'contained' : 'outlined'} 
                          color="success" 
                          startIcon={<CheckIcon />}
                          onClick={() => handleItemResponseChange(item.id, 'approved')}
                          sx={{ flex: 1, mr: 1 }}
                        >
                          Approve
                        </Button>
                      </Tooltip>
                      <Tooltip title="Reject this meal">
                        <Button 
                          variant={itemApprovals[item.id]?.response === 'rejected' ? 'contained' : 'outlined'} 
                          color="error" 
                          startIcon={<CloseIcon />}
                          onClick={() => handleItemResponseChange(item.id, 'rejected')}
                          sx={{ flex: 1 }}
                        >
                          Reject
                        </Button>
                      </Tooltip>
                    </Box>
                    
                    {itemApprovals[item.id]?.response === 'rejected' && (
                      <TextField
                        label="Feedback"
                        placeholder="Why are you rejecting this meal?"
                        multiline
                        rows={2}
                        value={itemApprovals[item.id]?.feedback || ''}
                        onChange={(e) => handleItemFeedbackChange(item.id, e.target.value)}
                        fullWidth
                        size="small"
                      />
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          
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
              onClick={handleSubmit}
              disabled={submitting || submitSuccess}
            >
              {submitting ? <CircularProgress size={24} /> : 'Submit Response'}
            </Button>
          </Box>
          
          {submitError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          )}
          
          {submitSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Your response has been submitted successfully. Redirecting...
            </Alert>
          )}
        </>
      ) : (
        <Alert severity="info">No meal plan found.</Alert>
      )}
    </Box>
  );
};

export default MealPlanApproval; 