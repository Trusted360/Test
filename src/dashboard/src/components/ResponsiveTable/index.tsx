import React from 'react';
import {
  Box,
  Table,
  TableContainer,
  Paper,
  Card,
  CardContent,
  Grid,
  useTheme,
  useMediaQuery,
  Typography,
  Stack
} from '@mui/material';

interface ResponsiveTableProps {
  children: React.ReactNode;
  mobileCards?: React.ReactNode;
  showMobileCards?: boolean;
}

interface ResponsiveTableRowProps {
  children: React.ReactNode;
  mobileCard?: React.ReactNode;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ 
  children, 
  mobileCards, 
  showMobileCards = true 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile && showMobileCards && mobileCards) {
    return (
      <Box sx={{ mt: 2 }}>
        {mobileCards}
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        {children}
      </Table>
    </TableContainer>
  );
};

export const MobileCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        {children}
      </CardContent>
    </Card>
  );
};

export const MobileCardRow: React.FC<{ 
  label: string; 
  value: React.ReactNode;
  fullWidth?: boolean;
}> = ({ 
  label, 
  value, 
  fullWidth = false 
}) => {
  return (
    <Stack 
      direction={fullWidth ? 'column' : 'row'} 
      justifyContent="space-between" 
      alignItems={fullWidth ? 'flex-start' : 'center'}
      spacing={fullWidth ? 0.5 : 1}
      sx={{ mb: 1 }}
    >
      <Typography variant="body2" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body2" component="dd" sx={{ margin: 0 }}>
        {value}
      </Typography>
    </Stack>
  );
};

export const MobileCardActions: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box sx={{ 
      pt: 2, 
      mt: 2, 
      borderTop: 1, 
      borderColor: 'divider',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 1
    }}>
      {children}
    </Box>
  );
};

export default ResponsiveTable;