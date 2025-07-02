import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  Factory as FactoryIcon,
  Store as StoreIcon
} from '@mui/icons-material';
import { 
  Property, 
  PropertyWithStats, 
  CreatePropertyData, 
  UpdatePropertyData,
  PropertyFilters,
  propertyService 
} from '../../services/property.service';
import { ResponsiveTable, MobileCard, MobileCardRow, MobileCardActions } from '../../components/ResponsiveTable';

const Properties: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [properties, setProperties] = useState<PropertyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreatePropertyData>({
    name: '',
    address: '',
    property_type: 'commercial',
    status: 'active'
  });
  const [formLoading, setFormLoading] = useState(false);

  // Load properties on component mount and when filters change
  useEffect(() => {
    loadProperties();
  }, [filters]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const searchFilters = {
        ...filters,
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await propertyService.getPropertiesWithSummary();
      setProperties(response.data);
      setTotalCount(response.count);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load properties');
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
  };

  const handleFilterChange = (key: keyof PropertyFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const handleCreateProperty = async () => {
    try {
      setFormLoading(true);
      await propertyService.createProperty(formData);
      setCreateDialogOpen(false);
      resetForm();
      loadProperties();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create property');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditProperty = async () => {
    if (!selectedProperty) return;
    
    try {
      setFormLoading(true);
      await propertyService.updateProperty(selectedProperty.id, formData);
      setEditDialogOpen(false);
      resetForm();
      loadProperties();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update property');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!selectedProperty) return;
    
    try {
      setFormLoading(true);
      await propertyService.deleteProperty(selectedProperty.id);
      setDeleteDialogOpen(false);
      setSelectedProperty(null);
      loadProperties();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete property');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      name: property.name,
      address: property.address,
      property_type: property.property_type,
      status: property.status
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (property: Property) => {
    setSelectedProperty(property);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      property_type: 'commercial',
      status: 'active'
    });
    setSelectedProperty(null);
  };

  const getPropertyIcon = (type: string) => {
    switch (type) {
      case 'commercial':
        return <BusinessIcon />;
      case 'residential':
        return <HomeIcon />;
      case 'industrial':
        return <FactoryIcon />;
      case 'retail':
        return <StoreIcon />;
      default:
        return <BusinessIcon />;
    }
  };

  if (loading && properties.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={2}
        >
          <Box>
            <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
              Properties
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Manage your security audit properties ({totalCount} total)
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
          >
            Add Property
          </Button>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={handleSearch}>
                      <SearchIcon />
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Property Type</InputLabel>
                <Select
                  value={filters.property_type || ''}
                  onChange={(e) => handleFilterChange('property_type', e.target.value)}
                  label="Property Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  {propertyService.getPropertyTypes().map(type => (
                    <MenuItem key={type} value={type}>
                      {propertyService.formatPropertyType(type)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {propertyService.getPropertyStatuses().map(status => (
                    <MenuItem key={status} value={status}>
                      {propertyService.formatPropertyStatus(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1}>
                <Button onClick={clearFilters} variant="outlined" size="small">
                  Clear
                </Button>
                <IconButton onClick={loadProperties} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* Properties Table/Cards */}
        <ResponsiveTable
          mobileCards={
            <>
              {properties.map((property) => (
                <MobileCard key={property.id}>
                  <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
                    {getPropertyIcon(property.property_type)}
                    <Box flexGrow={1}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {property.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {property.address}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <MobileCardRow 
                    label="Type" 
                    value={propertyService.formatPropertyType(property.property_type)} 
                  />
                  <MobileCardRow 
                    label="Status" 
                    value={
                      <Chip
                        label={propertyService.formatPropertyStatus(property.status)}
                        color={propertyService.getStatusColor(property.status)}
                        size="small"
                      />
                    } 
                  />
                  <MobileCardRow 
                    label="Cameras" 
                    value={property.camera_count || 0} 
                  />
                  <MobileCardRow 
                    label="Checklists" 
                    value={property.checklist_count || 0} 
                  />
                  <MobileCardRow 
                    label="Active Alerts" 
                    value={property.active_alerts ? (
                      <Chip
                        label={property.active_alerts}
                        color="error"
                        size="small"
                      />
                    ) : (
                      0
                    )} 
                  />
                  
                  <MobileCardActions>
                    <IconButton size="medium" color="primary">
                      <ViewIcon />
                    </IconButton>
                    <IconButton 
                      size="medium" 
                      color="primary" 
                      onClick={() => openEditDialog(property)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      size="medium" 
                      color="error" 
                      onClick={() => openDeleteDialog(property)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </MobileCardActions>
                </MobileCard>
              ))}
              {properties.length === 0 && !loading && (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    No properties found. Add your first property to get started.
                  </Typography>
                </Box>
              )}
            </>
          }
        >
          <TableHead>
            <TableRow>
              <TableCell>Property</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Cameras</TableCell>
              <TableCell align="center">Checklists</TableCell>
              <TableCell align="center">Active Alerts</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getPropertyIcon(property.property_type)}
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {property.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {property.address}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {propertyService.formatPropertyType(property.property_type)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={propertyService.formatPropertyStatus(property.status)}
                    color={propertyService.getStatusColor(property.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  {property.camera_count || 0}
                </TableCell>
                <TableCell align="center">
                  {property.checklist_count || 0}
                </TableCell>
                <TableCell align="center">
                  {property.active_alerts ? (
                    <Chip
                      label={property.active_alerts}
                      color="error"
                      size="small"
                    />
                  ) : (
                    0
                  )}
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Property">
                      <IconButton size="small" onClick={() => openEditDialog(property)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Property">
                      <IconButton size="small" onClick={() => openDeleteDialog(property)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {properties.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No properties found. Add your first property to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ResponsiveTable>

        {/* Create Property Dialog */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>Add New Property</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Property Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                multiline
                rows={2}
                required
              />
              <FormControl fullWidth>
                <InputLabel>Property Type</InputLabel>
                <Select
                  value={formData.property_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, property_type: e.target.value }))}
                  label="Property Type"
                >
                  {propertyService.getPropertyTypes().map(type => (
                    <MenuItem key={type} value={type}>
                      {propertyService.formatPropertyType(type)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  {propertyService.getPropertyStatuses().map(status => (
                    <MenuItem key={status} value={status}>
                      {propertyService.formatPropertyStatus(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateProperty} 
              variant="contained"
              disabled={formLoading || !formData.name || !formData.address}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Create Property'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Property Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>Edit Property</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Property Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                multiline
                rows={2}
                required
              />
              <FormControl fullWidth>
                <InputLabel>Property Type</InputLabel>
                <Select
                  value={formData.property_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, property_type: e.target.value }))}
                  label="Property Type"
                >
                  {propertyService.getPropertyTypes().map(type => (
                    <MenuItem key={type} value={type}>
                      {propertyService.formatPropertyType(type)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  {propertyService.getPropertyStatuses().map(status => (
                    <MenuItem key={status} value={status}>
                      {propertyService.formatPropertyStatus(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleEditProperty} 
              variant="contained"
              disabled={formLoading || !formData.name || !formData.address}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Update Property'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Property</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedProperty?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleDeleteProperty} 
              color="error" 
              variant="contained"
              disabled={formLoading}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
};

export default Properties;
