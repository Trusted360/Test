import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { formatDistanceToNow, isPast, isToday, addDays, format } from 'date-fns';

/**
 * Component for displaying and filtering pantry items
 */
function PantryList({ items, onUpdateItem, onDeleteItem }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editItem, setEditItem] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  // Extract unique categories from items
  const categories = useMemo(() => {
    const cats = new Set();
    items.forEach(item => {
      if (item.ingredient_category) {
        cats.add(item.ingredient_category);
      }
    });
    return ['all', ...Array.from(cats)];
  }, [items]);
  
  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchTerm || 
        item.ingredient_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || 
        item.ingredient_category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);
  
  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = {};
    
    filteredItems.forEach(item => {
      const category = item.ingredient_category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    
    // Sort categories
    return Object.keys(groups)
      .sort()
      .reduce((acc, key) => {
        // Sort items by name within each category
        acc[key] = groups[key].sort((a, b) => 
          a.ingredient_name.localeCompare(b.ingredient_name)
        );
        return acc;
      }, {});
  }, [filteredItems]);
  
  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  // Handle category filter change
  const handleCategoryChange = (event) => {
    setCategoryFilter(event.target.value);
  };
  
  // Open edit dialog
  const handleEditClick = (item) => {
    setEditItem({
      ...item,
      quantity: parseFloat(item.quantity),
      expiryDate: item.expiry_date ? new Date(item.expiry_date) : null
    });
  };
  
  // Close edit dialog
  const handleEditClose = () => {
    setEditItem(null);
  };
  
  // Save edited item
  const handleEditSave = () => {
    if (editItem) {
      onUpdateItem(editItem.id, {
        quantity: editItem.quantity,
        unitId: editItem.unit_id,
        expiryDate: editItem.expiryDate,
        notes: editItem.notes
      });
      setEditItem(null);
    }
  };
  
  // Handle form field changes
  const handleEditChange = (field) => (event) => {
    setEditItem({
      ...editItem,
      [field]: event.target.value
    });
  };
  
  // Open delete confirmation
  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };
  
  // Close delete confirmation
  const handleDeleteClose = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };
  
  // Confirm deletion
  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      onDeleteItem(itemToDelete.id);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };
  
  // Get status badge for expiry date
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    
    const date = new Date(expiryDate);
    
    if (isPast(date) && !isToday(date)) {
      return (
        <Chip 
          icon={<WarningIcon />} 
          label="Expired" 
          color="error" 
          size="small"
        />
      );
    }
    
    if (isToday(date)) {
      return (
        <Chip 
          icon={<WarningIcon />} 
          label="Expires today" 
          color="warning" 
          size="small"
        />
      );
    }
    
    if (date <= addDays(new Date(), 7)) {
      return (
        <Chip 
          icon={<CalendarTodayIcon />} 
          label={`Expires in ${formatDistanceToNow(date, { addSuffix: false })}`} 
          color="warning" 
          size="small"
        />
      );
    }
    
    return null;
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="category-filter-label">Category</InputLabel>
              <Select
                labelId="category-filter-label"
                id="category-filter"
                value={categoryFilter}
                onChange={handleCategoryChange}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      
      {Object.keys(groupedItems).length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            No ingredients found. Add some to your pantry!
          </Typography>
        </Paper>
      ) : (
        Object.entries(groupedItems).map(([category, categoryItems]) => (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {category}
            </Typography>
            
            <Grid container spacing={2}>
              {categoryItems.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" component="div">
                        {item.ingredient_name}
                      </Typography>
                      
                      <Typography variant="body1" color="text.secondary">
                        {item.quantity} {item.unit_symbol || item.unit_name || ''}
                      </Typography>
                      
                      {item.expiry_date && (
                        <Box sx={{ mt: 1 }}>
                          {getExpiryStatus(item.expiry_date)}
                        </Box>
                      )}
                      
                      {item.notes && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {item.notes}
                        </Typography>
                      )}
                      
                      <Stack 
                        direction="row" 
                        spacing={1} 
                        sx={{ mt: 2, justifyContent: 'flex-end' }}
                      >
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditClick(item)}
                          aria-label="Edit"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteClick(item)}
                          aria-label="Delete"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}
      
      {/* Edit Item Dialog */}
      {editItem && (
        <Dialog 
          open={!!editItem} 
          onClose={handleEditClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit {editItem.ingredient_name}</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={editItem.quantity}
                    onChange={handleEditChange('quantity')}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" sx={{ pt: 2 }}>
                    {editItem.unit_name || 'units'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    type="date"
                    value={editItem.expiryDate ? format(new Date(editItem.expiryDate), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setEditItem({
                      ...editItem,
                      expiryDate: e.target.value ? new Date(e.target.value) : null
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={2}
                    value={editItem.notes || ''}
                    onChange={handleEditChange('notes')}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditClose}>Cancel</Button>
            <Button onClick={handleEditSave} variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteClose}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove {itemToDelete?.ingredient_name} from your pantry?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

PantryList.propTypes = {
  items: PropTypes.array.isRequired,
  onUpdateItem: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired
};

export default PantryList; 