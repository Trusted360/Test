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
            Your self-storage security overview
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Typography variant="h6" gutterBottom>
                Recent Audits
              </Typography>
              <Typography variant="body2">
                No recent audits completed. Start your first site audit today!
              </Typography>
            </StyledPaper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Typography variant="h6" gutterBottom>
                Active Alerts
              </Typography>
              <Typography variant="body2">
                No active alerts. All systems are operating normally.
              </Typography>
            </StyledPaper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Typography variant="h6" gutterBottom>
                Site Monitoring
              </Typography>
              <Typography variant="body2">
                Monitor your facilities and edge devices from this central dashboard.
              </Typography>
            </StyledPaper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              <Typography variant="body2">
                All edge devices are online and functioning properly.
              </Typography>
            </StyledPaper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default Dashboard; 