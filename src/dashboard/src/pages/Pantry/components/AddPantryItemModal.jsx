import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Autocomplete,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography
} from '@mui/material';
import { format } from 'date-fns';
import api from '../../../services/api';

/**
 * Modal for adding a new pantry item
 */
function AddPantryItemModal({ open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    ingredientId: '',
    ingredientName: '',
    quantity: '',
    unitId: '',
    expiryDate: null,
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [units, setUnits] = useState([]);
  const [searchText, setSearchText] = useState('');
  
  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        ingredientId: '',
        ingredientName: '',
        quantity: '',
        unitId: '',
        expiryDate: null,
        notes: ''
      });
      setSearchText('');
    }
  }, [open]);
  
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
    
    if (open) {
      fetchUnits();
    }
  }, [open]);
  
  // Search for ingredients
  const searchIngredients = async (query) => {
    if (!query) {
      setIngredients([]);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.get(`/ingredients/search?q=${query}`);
      setIngredients(response.data.data);
    } catch (error) {
      console.error('Error searching ingredients:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Debounced ingredient search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchIngredients(searchText);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchText]);
  
  // Handle form field changes
  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };
  
  // Handle ingredient selection
  const handleIngredientChange = (event, newValue) => {
    if (newValue) {
      setFormData({
        ...formData,
        ingredientId: newValue.id,
        ingredientName: newValue.name
      });
    } else {
      setFormData({
        ...formData,
        ingredientId: '',
        ingredientName: ''
      });
    }
  };
  
  // Handle ingredient search input change
  const handleIngredientInputChange = (event, newInputValue) => {
    setSearchText(newInputValue);
    setFormData({
      ...formData,
      ingredientName: newInputValue,
      ingredientId: '' // Clear ID if user is typing manually
    });
  };
  
  // Handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    
    // Validate form
    if (!formData.ingredientName || !formData.quantity) {
      return;
    }
    
    // Convert quantity to number
    const parsedData = {
      ...formData,
      quantity: parseFloat(formData.quantity)
    };
    
    onSubmit(parsedData);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add Pantry Item</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                fullWidth
                options={ingredients}
                getOptionLabel={(option) => option.name || ''}
                loading={loading}
                onInputChange={handleIngredientInputChange}
                onChange={handleIngredientChange}
                filterOptions={(x) => x}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Ingredient"
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary">
                Search for an existing ingredient or enter a new one
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                required
                value={formData.quantity}
                onChange={handleChange('quantity')}
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="unit-label">Unit</InputLabel>
                <Select
                  labelId="unit-label"
                  value={formData.unitId}
                  onChange={handleChange('unitId')}
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
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Expiry Date"
                type="date"
                value={formData.expiryDate ? 
                  format(new Date(formData.expiryDate), 'yyyy-MM-dd') : ''}
                onChange={(e) => setFormData({
                  ...formData,
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
                value={formData.notes}
                onChange={handleChange('notes')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={!formData.ingredientName || !formData.quantity}
          >
            Add Item
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

AddPantryItemModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export default AddPantryItemModal; 