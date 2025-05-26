import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  Grid,
  IconButton,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../../services/api';

/**
 * Component for bulk adding ingredients to pantry
 */
function BulkEntryPanel({ onSubmit }) {
  const [items, setItems] = useState([
    { ingredientName: '', quantity: '', unitId: '', notes: '' }
  ]);
  const [ingredients, setIngredients] = useState([]);
  const [units, setUnits] = useState([]);
  
  // Fetch units
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const response = await api.get('/units');
        setUnits(response.data.data);
      } catch (error) {
        console.error('Error fetching units:', error);
      }
    };
    
    fetchUnits();
  }, []);
  
  // Search for ingredients
  const searchIngredients = async (query) => {
    if (!query) {
      return [];
    }
    
    try {
      const response = await api.get(`/ingredients/search?q=${query}`);
      return response.data.data;
    } catch (error) {
      console.error('Error searching ingredients:', error);
      return [];
    }
  };
  
  // Add empty item row
  const addItem = () => {
    setItems([...items, { ingredientName: '', quantity: '', unitId: '', notes: '' }]);
  };
  
  // Remove item row
  const removeItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };
  
  // Update an item's field
  const updateItemField = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };
  
  // Handle submit
  const handleSubmit = () => {
    // Filter out empty items
    const validItems = items.filter(item => item.ingredientName && item.quantity);
    
    if (validItems.length === 0) {
      return;
    }
    
    // Convert quantities to numbers
    const processedItems = validItems.map(item => ({
      ...item,
      quantity: parseFloat(item.quantity)
    }));
    
    onSubmit(processedItems);
    
    // Reset form
    setItems([{ ingredientName: '', quantity: '', unitId: '', notes: '' }]);
  };
  
  // Check if the form is valid
  const isValid = items.some(item => item.ingredientName && item.quantity);

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Bulk Add Items
      </Typography>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add multiple ingredients to your pantry at once. You can add new ingredients 
          or select from existing ones.
        </Typography>
        
        {items.map((item, index) => (
          <Card 
            key={index} 
            variant="outlined" 
            sx={{ mb: 2, position: 'relative' }}
          >
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    fullWidth
                    freeSolo
                    options={ingredients}
                    getOptionLabel={(option) => option.name || option}
                    inputValue={item.ingredientName}
                    onInputChange={async (event, newValue) => {
                      updateItemField(index, 'ingredientName', newValue);
                      
                      if (newValue && newValue.length > 2) {
                        const results = await searchIngredients(newValue);
                        setIngredients(results);
                      }
                    }}
                    onChange={(event, newValue) => {
                      if (typeof newValue === 'string') {
                        updateItemField(index, 'ingredientName', newValue);
                      } else if (newValue && newValue.name) {
                        updateItemField(index, 'ingredientName', newValue.name);
                        updateItemField(index, 'ingredientId', newValue.id);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Ingredient"
                        variant="outlined"
                        placeholder="Type to search"
                        required
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    inputProps={{ min: 0, step: 0.1 }}
                    value={item.quantity}
                    onChange={(e) => updateItemField(index, 'quantity', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth>
                    <InputLabel id={`unit-label-${index}`}>Unit</InputLabel>
                    <Select
                      labelId={`unit-label-${index}`}
                      value={item.unitId}
                      onChange={(e) => updateItemField(index, 'unitId', e.target.value)}
                      label="Unit"
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {units.map((unit) => (
                        <MenuItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.symbol})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={10} md={3}>
                  <TextField
                    fullWidth
                    label="Notes"
                    value={item.notes}
                    onChange={(e) => updateItemField(index, 'notes', e.target.value)}
                  />
                </Grid>
                <Grid item xs={2} md={1} sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    color="error"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    aria-label="Remove item"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button
            startIcon={<AddIcon />}
            onClick={addItem}
            variant="outlined"
          >
            Add Another Item
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={!isValid}
          >
            Add All to Pantry
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

BulkEntryPanel.propTypes = {
  onSubmit: PropTypes.func.isRequired
};

export default BulkEntryPanel; 