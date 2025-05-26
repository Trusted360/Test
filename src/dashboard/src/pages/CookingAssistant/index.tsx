import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  CircularProgress
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { useAuth } from '../../context/AuthContext';
import { GET_ACTIVE_COOKING_SESSIONS } from '@services/cookingAssistant';
import RecipeSelector from './RecipeSelector';

const CookingAssistant = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);

  // Get active cooking sessions
  const { loading, error, data, refetch } = useQuery(GET_ACTIVE_COOKING_SESSIONS, {
    variables: { memberId: user?.member?.id },
    skip: !user?.member?.id,
    fetchPolicy: 'network-only'
  });

  // Handle start new session
  const handleStartNewSession = () => {
    setShowRecipeSelector(true);
  };

  // Handle continue session
  const handleContinueSession = (sessionId: string) => {
    navigate(`/cooking-assistant/${sessionId}`);
  };

  // Handle recipe selected
  const handleRecipeSelected = () => {
    setShowRecipeSelector(false);
    refetch();
  };

  // Handle close recipe selector
  const handleCloseRecipeSelector = () => {
    setShowRecipeSelector(false);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Cooking Assistant
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon />}
          onClick={handleStartNewSession}
        >
          Start New Session
        </Button>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">Error loading cooking sessions</Typography>
      ) : data?.activeCookingSessions?.length > 0 ? (
        <>
          <Typography variant="h6" gutterBottom>
            Active Cooking Sessions
          </Typography>
          <Grid container spacing={3}>
            {data.activeCookingSessions.map((session: any) => (
              <Grid item xs={12} sm={6} md={4} key={session.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      {session.recipe.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Started: {new Date(session.startTime).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Progress: Step {session.currentStep + 1} of {session.totalSteps}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => handleContinueSession(session.id)}
                    >
                      Continue Cooking
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          p={6}
          textAlign="center"
        >
          <RestaurantIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Active Cooking Sessions
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Start a new cooking session to get interactive guidance while you cook.
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={handleStartNewSession}
          >
            Start Cooking
          </Button>
        </Box>
      )}

      {/* Recipe selector dialog */}
      <RecipeSelector
        open={showRecipeSelector}
        onClose={handleCloseRecipeSelector}
        onRecipeSelected={handleRecipeSelected}
      />
    </Box>
  );
};

export default CookingAssistant;
