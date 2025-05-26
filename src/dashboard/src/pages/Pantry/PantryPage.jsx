import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Tabs, 
  Tab, 
  Alert,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import pantryService from '../../services/pantry.service';
import PantryList from './components/PantryList';
import AddPantryItemModal from './components/AddPantryItemModal';
import ExpiringItemsPanel from './components/ExpiringItemsPanel';
import BulkEntryPanel from './components/BulkEntryPanel';

/**
 * Pantry management page for viewing and managing available ingredients
 */
function PantryPage() {
  const [pantryItems, setPantryItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  
  // Fetch pantry data on component mount
  useEffect(() => {
    fetchPantryData();
  }, []);
  
  // Fetch pantry items and expiring items
  const fetchPantryData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [items, expiring] = await Promise.all([
        pantryService.getPantryItems(),
        pantryService.getExpiringItems()
      ]);
      
      setPantryItems(items);
      setExpiringItems(expiring);
    } catch (err) {
      console.error('Error fetching pantry data:', err);
      setError('Failed to load pantry data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle modal open/close
  const handleAddItemClick = () => {
    setIsAddItemModalOpen(true);
  };
  
  const handleModalClose = () => {
    setIsAddItemModalOpen(false);
  };
  
  // Add a new pantry item
  const handleAddItem = async (newItem) => {
    try {
      await pantryService.addPantryItem(newItem);
      fetchPantryData(); // Refresh data
      handleModalClose();
    } catch (err) {
      console.error('Error adding pantry item:', err);
      setError('Failed to add item. Please try again.');
    }
  };
  
  // Update an existing pantry item
  const handleUpdateItem = async (id, updates) => {
    try {
      await pantryService.updatePantryItem(id, updates);
      fetchPantryData(); // Refresh data
    } catch (err) {
      console.error('Error updating pantry item:', err);
      setError('Failed to update item. Please try again.');
    }
  };
  
  // Delete a pantry item
  const handleDeleteItem = async (id) => {
    try {
      await pantryService.deletePantryItem(id);
      fetchPantryData(); // Refresh data
    } catch (err) {
      console.error('Error deleting pantry item:', err);
      setError('Failed to delete item. Please try again.');
    }
  };
  
  // Add multiple pantry items at once
  const handleBulkAdd = async (items) => {
    try {
      await pantryService.bulkAddPantryItems(items);
      fetchPantryData(); // Refresh data
      setActiveTab(0); // Switch back to main list
    } catch (err) {
      console.error('Error bulk adding pantry items:', err);
      setError('Failed to add items. Please try again.');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Pantry Management
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleAddItemClick}
          >
            Add Item
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {expiringItems.length > 0 && (
          <ExpiringItemsPanel 
            items={expiringItems} 
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
          />
        )}
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            aria-label="pantry tabs"
          >
            <Tab label="Inventory" id="tab-0" />
            <Tab label="Bulk Entry" id="tab-1" />
          </Tabs>
        </Box>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Inventory Tab */}
            <Box 
              role="tabpanel"
              hidden={activeTab !== 0}
              id="tabpanel-0"
              aria-labelledby="tab-0"
            >
              {activeTab === 0 && (
                <PantryList 
                  items={pantryItems} 
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                />
              )}
            </Box>
            
            {/* Bulk Entry Tab */}
            <Box 
              role="tabpanel"
              hidden={activeTab !== 1}
              id="tabpanel-1"
              aria-labelledby="tab-1"
            >
              {activeTab === 1 && (
                <BulkEntryPanel onSubmit={handleBulkAdd} />
              )}
            </Box>
          </>
        )}
      </Box>
      
      {/* Add Item Modal */}
      <AddPantryItemModal
        open={isAddItemModalOpen}
        onClose={handleModalClose}
        onSubmit={handleAddItem}
      />
    </Container>
  );
}

export default PantryPage; 