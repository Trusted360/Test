import React from 'react';
import { Box, Typography, Paper, styled } from '@mui/material';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
}));

const Shopping: React.FC = () => {
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Shopping List
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your grocery shopping list.
      </Typography>

      <StyledPaper elevation={2}>
        <Typography variant="h6" gutterBottom>
          Shopping Items
        </Typography>
        <Typography variant="body2">
          Your shopping page is under development. This is a placeholder page.
        </Typography>
      </StyledPaper>
    </Box>
  );
};

export default Shopping; 