import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  TextField,
  IconButton,
  Chip,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  CardHeader,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Rating
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CloseIcon from '@mui/icons-material/Close';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { useAuth } from '../../context/AuthContext';
import {
  GET_COOKING_SESSION,
  SEND_COOKING_MESSAGE,
  GET_NEXT_COOKING_STEP,
  GET_PREVIOUS_COOKING_STEP,
  GET_INGREDIENT_SUBSTITUTIONS,
  END_COOKING_SESSION
} from '@services/cookingAssistant';

// Message component
const Message = ({ role, content }: { role: string; content: string }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: role === 'user' ? 'row-reverse' : 'row',
      mb: 2
    }}
  >
    <Paper
      elevation={1}
      sx={{
        p: 2,
        maxWidth: '80%',
        borderRadius: 2,
        backgroundColor: role === 'user' ? 'primary.light' : 'background.paper',
        color: role === 'user' ? 'primary.contrastText' : 'text.primary'
      }}
    >
      <Typography variant="body1">{content}</Typography>
    </Paper>
  </Box>
);

// Ingredient substitution dialog
interface SubstitutionDialogProps {
  open: boolean;
  onClose: () => void;
  ingredient: string;
  substitutions: any[];
  loading: boolean;
}

const SubstitutionDialog = ({
  open,
  onClose,
  ingredient,
  substitutions,
  loading
}: SubstitutionDialogProps) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>
      Substitutions for {ingredient}
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{ position: 'absolute', right: 8, top: 8 }}
      >
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent>
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : substitutions && substitutions.length > 0 ? (
        <List>
          {substitutions.map((sub, index) => (
            <ListItem key={index} divider={index < substitutions.length - 1}>
              <ListItemText
                primary={
                  <Typography variant="h6">
                    {sub.name}
                    <Chip
                      label={sub.suitability || 'Medium'}
                      size="small"
                      color={
                        sub.suitability === 'high'
                          ? 'success'
                          : sub.suitability === 'low'
                          ? 'error'
                          : 'primary'
                      }
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                }
                secondary={
                  <>
                    <Typography variant="body2" paragraph>
                      {sub.description}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Conversion:</strong> {sub.conversionRatio ? `${sub.conversionRatio}:1` : '1:1'}
                    </Typography>
                    {sub.flavor && (
                      <Typography variant="body2">
                        <strong>Flavor:</strong> {sub.flavor}
                      </Typography>
                    )}
                    {sub.instructionChanges && (
                      <Typography variant="body2">
                        <strong>Cooking adjustments:</strong> {sub.instructionChanges}
                      </Typography>
                    )}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
          No substitutions found for {ingredient}.
        </Typography>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="primary">
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

// End session dialog
interface EndSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
  loading: boolean;
}

const EndSessionDialog = ({
  open,
  onClose,
  onSubmit,
  loading
}: EndSessionDialogProps) => {
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (rating) {
      onSubmit(rating, feedback);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>End Cooking Session</DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          How was your cooking experience? Your feedback helps us improve.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Typography component="legend">Rate your experience:</Typography>
          <Rating
            name="cooking-rating"
            value={rating}
            onChange={(event, newValue) => {
              setRating(newValue);
            }}
            size="large"
          />
          <TextField
            label="Feedback (optional)"
            multiline
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={!rating || loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit & End Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main component
const CookingSession = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [showSubstitutionDialog, setShowSubstitutionDialog] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);

  // Get cooking session
  const { loading, error, data, refetch } = useQuery(GET_COOKING_SESSION, {
    variables: { id: sessionId },
    skip: !sessionId,
    fetchPolicy: 'network-only'
  });

  // Send message mutation
  const [sendMessage, { loading: sendingMessage }] = useMutation(SEND_COOKING_MESSAGE, {
    onCompleted: () => {
      setMessage('');
      refetch();
    }
  });

  // Get next step mutation
  const [getNextStep, { loading: gettingNextStep }] = useMutation(GET_NEXT_COOKING_STEP, {
    onCompleted: () => {
      refetch();
    }
  });

  // Get previous step mutation
  const [getPreviousStep, { loading: gettingPreviousStep }] = useMutation(GET_PREVIOUS_COOKING_STEP, {
    onCompleted: () => {
      refetch();
    }
  });

  // Get ingredient substitutions mutation
  const [getSubstitutions, { loading: gettingSubstitutions, data: substitutionsData }] = useMutation(
    GET_INGREDIENT_SUBSTITUTIONS
  );

  // End session mutation
  const [endSession, { loading: endingSession }] = useMutation(END_COOKING_SESSION, {
    onCompleted: () => {
      navigate('/cooking-assistant');
    }
  });

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.cookingSession?.messages]);

  // Handle send message
  const handleSendMessage = () => {
    if (message.trim() && sessionId) {
      sendMessage({
        variables: {
          input: {
            sessionId,
            message: message.trim()
          }
        }
      });
    }
  };

  // Handle key press
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Handle next step
  const handleNextStep = () => {
    if (sessionId) {
      getNextStep({
        variables: { sessionId }
      });
    }
  };

  // Handle previous step
  const handlePreviousStep = () => {
    if (sessionId) {
      getPreviousStep({
        variables: { sessionId }
      });
    }
  };

  // Handle ingredient click for substitution
  const handleIngredientClick = (ingredient: string) => {
    setSelectedIngredient(ingredient);
    setShowSubstitutionDialog(true);
    
    if (sessionId) {
      getSubstitutions({
        variables: {
          input: {
            sessionId,
            ingredient
          }
        }
      });
    }
  };

  // Handle end session
  const handleEndSession = (rating: number, feedback: string) => {
    if (sessionId) {
      endSession({
        variables: {
          input: {
            sessionId,
            rating,
            feedback
          }
        }
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box>
        <Typography color="error" variant="h6">
          Error loading cooking session
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/cooking-assistant')}
          sx={{ mt: 2 }}
        >
          Back to Cooking Assistant
        </Button>
      </Box>
    );
  }

  // Get session data
  const session = data?.cookingSession;
  if (!session) {
    return (
      <Box>
        <Typography variant="h6">Session not found</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/cooking-assistant')}
          sx={{ mt: 2 }}
        >
          Back to Cooking Assistant
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" component="h1">
          {session.recipe?.name || 'Cooking Session'}
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => setShowEndSessionDialog(true)}
        >
          End Session
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Recipe details */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Recipe Details" />
            <CardContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                {session.recipe?.description}
              </Typography>
              <Typography variant="body2">
                <strong>Prep Time:</strong> {session.recipe?.prepTime} minutes
              </Typography>
              <Typography variant="body2">
                <strong>Cook Time:</strong> {session.recipe?.cookTime} minutes
              </Typography>
              <Typography variant="body2">
                <strong>Servings:</strong> {session.recipe?.servings}
              </Typography>
              
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Ingredients:
              </Typography>
              <List dense>
                {session.recipe?.ingredients.map((ing: any) => (
                  <ListItem key={ing.id} disablePadding>
                    <ListItemText
                      primary={
                        <Button
                          color="primary"
                          size="small"
                          onClick={() => handleIngredientClick(ing.ingredient.name)}
                          startIcon={<SwapHorizIcon fontSize="small" />}
                          sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                        >
                          {ing.quantity} {ing.unit} {ing.ingredient.name}
                        </Button>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Chat and steps */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Step {session.currentStep + 1} of {session.totalSteps}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handlePreviousStep}
                disabled={session.currentStep === 0 || gettingPreviousStep}
                sx={{ mr: 1 }}
              >
                Previous
              </Button>
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={handleNextStep}
                disabled={
                  session.currentStep === session.totalSteps - 1 || gettingNextStep
                }
              >
                Next Step
              </Button>
            </Box>
            
            <Stepper activeStep={session.currentStep} orientation="vertical">
              {session.recipe?.instructions.map((step: string, index: number) => (
                <Step key={index}>
                  <StepLabel>{`Step ${index + 1}`}</StepLabel>
                  <StepContent>
                    <Typography>{step}</Typography>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Paper>

          <Paper sx={{ p: 2, height: '400px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Cooking Assistant
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {/* Messages container */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
              {session.messages?.map((msg: any) => (
                <Message key={msg.id} role={msg.role} content={msg.content} />
              ))}
              <div ref={messagesEndRef} />
            </Box>
            
            {/* Message input */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                fullWidth
                placeholder="Ask a question about the recipe..."
                variant="outlined"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sendingMessage}
                sx={{ mr: 1 }}
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={!message.trim() || sendingMessage}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Substitution dialog */}
      <SubstitutionDialog
        open={showSubstitutionDialog}
        onClose={() => setShowSubstitutionDialog(false)}
        ingredient={selectedIngredient}
        substitutions={substitutionsData?.getIngredientSubstitutions?.substitutions || []}
        loading={gettingSubstitutions}
      />

      {/* End session dialog */}
      <EndSessionDialog
        open={showEndSessionDialog}
        onClose={() => setShowEndSessionDialog(false)}
        onSubmit={handleEndSession}
        loading={endingSession}
      />
    </Box>
  );
};

export default CookingSession;
