import React from 'react';
import { Typography, Box, Grid, Paper, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.name || 'Guest'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Here's what's cooking in your kitchen today
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Typography variant="h6" gutterBottom>
                Recent Recipes
              </Typography>
              <Typography variant="body2">
                You have no recent recipes. Start exploring our collection!
              </Typography>
            </StyledPaper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Typography variant="h6" gutterBottom>
                Upcoming Meals
              </Typography>
              <Typography variant="body2">
                No planned meals. Start planning your week!
              </Typography>
            </StyledPaper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Typography variant="h6" gutterBottom>
                Shopping List
              </Typography>
              <Typography variant="body2">
                Your shopping list is empty. Add items to get started!
              </Typography>
            </StyledPaper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Typography variant="h6" gutterBottom>
                Kitchen Tips
              </Typography>
              <Typography variant="body2">
                Organize your pantry by food categories to make ingredients easier to find.
              </Typography>
            </StyledPaper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default Dashboard; 