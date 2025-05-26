import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  Stack,
  Alert,
  AlertTitle
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { format, isPast, isToday } from 'date-fns';

/**
 * Panel displaying soon-to-expire ingredients
 */
function ExpiringItemsPanel({ items, onUpdateItem, onDeleteItem }) {
  // Sort items by expiry date (soonest first)
  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(a.expiry_date);
    const dateB = new Date(b.expiry_date);
    return dateA - dateB;
  });
  
  // Get status for expiry date
  const getExpiryStatus = (expiryDate) => {
    const date = new Date(expiryDate);
    
    if (isPast(date) && !isToday(date)) {
      return 'expired';
    }
    
    if (isToday(date)) {
      return 'today';
    }
    
    return 'soon';
  };
  
  // Delete an item
  const handleDelete = (id) => {
    onDeleteItem(id);
  };
  
  // Format the expiry date
  const formatExpiryDate = (expiryDate) => {
    const date = new Date(expiryDate);
    const status = getExpiryStatus(expiryDate);
    
    if (status === 'expired') {
      return `Expired on ${format(date, 'MMM d, yyyy')}`;
    }
    
    if (status === 'today') {
      return 'Expires today';
    }
    
    return `Expires on ${format(date, 'MMM d, yyyy')}`;
  };
  
  // Get alert severity based on expiry status
  const getAlertSeverity = (status) => {
    switch (status) {
      case 'expired':
        return 'error';
      case 'today':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Paper 
      sx={{ 
        mb: 4, 
        p: 2, 
        border: '1px solid', 
        borderColor: 'warning.light'
      }}
    >
      <Alert 
        severity="warning" 
        sx={{ mb: 2 }}
      >
        <AlertTitle>Expiring Ingredients</AlertTitle>
        You have {items.length} ingredient{items.length !== 1 ? 's' : ''} that will expire soon
      </Alert>
      
      <List>
        {sortedItems.map((item, index) => {
          const status = getExpiryStatus(item.expiry_date);
          
          return (
            <React.Fragment key={item.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={() => handleDelete(item.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body1">
                        {item.ingredient_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({item.quantity} {item.unit_symbol || item.unit_name || ''})
                      </Typography>
                    </Stack>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={formatExpiryDate(item.expiry_date)}
                        color={getAlertSeverity(status)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                />
              </ListItem>
            </React.Fragment>
          );
        })}
      </List>
    </Paper>
  );
}

ExpiringItemsPanel.propTypes = {
  items: PropTypes.array.isRequired,
  onUpdateItem: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired
};

export default ExpiringItemsPanel; 