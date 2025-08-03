import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Assignment as SOPIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';

// Simple interfaces matching checklist pattern
interface SOPTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  is_active: boolean;
  created_by?: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

interface PropertySOP {
  id: number;
  property_id: number;
  template_id: number;
  assigned_to?: number;
  status: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  property_name?: string;
  template_name?: string;
  assigned_to_name?: string;
}

interface SOPFilters {
  category?: string;
  status?: string;
  property_id?: number;
  search?: string;
}

interface CreateSOPTemplateData {
  name: string;
  description?: string;
  category: string;
  is_active: boolean;
}

interface CreatePropertySOPData {
  property_id: number;
  template_id: number;
  assigned_to?: number;
  status: string;
  due_date?: string;
}

const SOPs: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State management - exactly like Properties page
  const [sopTemplates, setSOPTemplates] = useState<SOPTemplate[]>([]);
  const [propertySops, setPropertySOPs] = useState<PropertySOP[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SOPFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false);
  const [createSOPDialogOpen, setCreateSOPDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SOPTemplate | null>(null);

  // Form states
  const [templateFormData, setTemplateFormData] = useState<CreateSOPTemplateData>({
    name: '',
    description: '',
    category: 'procedure',
    is_active: true
  });
  const [sopFormData, setSOPFormData] = useState<CreatePropertySOPData>({
    property_id: 0,
    template_id: 0,
    assigned_to: undefined,
    status: 'pending',
    due_date: undefined
  });
  const [formLoading, setFormLoading] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load properties for dropdown
      const propertiesResponse = await fetch('/api/properties', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const loadedProperties = propertiesResponse.ok ? (await propertiesResponse.json()).data || [] : [];
      setProperties(loadedProperties);

      // Load SOP templates
      const templatesResponse = await fetch('/api/sops/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setSOPTemplates(templatesData.data || []);
      }

      // Load property SOPs for all loaded properties
      if (loadedProperties.length > 0) {
        const propertySOPsPromises = loadedProperties.map(async (p: any) => {
          const response = await fetch(`/api/sops/properties/${p.id}`, {
             headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            const sopsData = await response.json();
            // The backend returns an array of SOPs for a property
            return sopsData.data || [];
          }
          return [];
        });
        
        const allPropertiesSOPs = (await Promise.all(propertySOPsPromises)).flat();
        setPropertySOPs(allPropertiesSOPs);
      } else {
        setPropertySOPs([]);
      }

    } catch (err: any) {
      setError('Failed to load SOP data');
      console.error('Error loading SOPs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setFormLoading(true);
      const response = await fetch('/api/sops/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(templateFormData)
      });

      if (response.ok) {
        setCreateTemplateDialogOpen(false);
        resetTemplateForm();
        loadData();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create SOP template');
      }
    } catch (err: any) {
      setError('Failed to create SOP template');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreatePropertySOP = async () => {
    try {
      setFormLoading(true);
      // Backend expects property_id in the URL
      const response = await fetch(`/api/sops/properties/${sopFormData.property_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          template_id: sopFormData.template_id,
          assigned_to: sopFormData.assigned_to,
          due_date: sopFormData.due_date
        })
      });

      if (response.ok) {
        setCreateSOPDialogOpen(false);
        resetSOPForm();
        loadData();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to assign SOP to property');
      }
    } catch (err: any) {
      setError('Failed to assign SOP to property');
    } finally {
      setFormLoading(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      description: '',
      category: 'procedure',
      is_active: true
    });
  };

  const resetSOPForm = () => {
    setSOPFormData({
      property_id: 0,
      template_id: 0,
      assigned_to: undefined,
      status: 'pending',
      due_date: undefined
    });
  };

  const handleDeleteClick = (template: SOPTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) return;

    try {
      setFormLoading(true);
      const response = await fetch(`/api/sop-templates/${selectedTemplate.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        setSelectedTemplate(null);
        loadData();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete SOP template');
      }
    } catch (err: any) {
      setError('Failed to delete SOP template');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedTemplate(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'pending':
        return <WarningIcon color="warning" />;
      case 'in_progress':
        return <SOPIcon color="primary" />;
      default:
        return <ArchiveIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'primary' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'primary';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={3}>
        {/* Header - exactly like Properties page */}
        <Box display="flex" flexDirection={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "stretch" : "center"} gap={isMobile ? 2 : 0}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Standard Operating Procedures
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Manage SOP templates and assign them to properties
            </Typography>
          </Box>
          <Stack direction={isMobile ? "column" : "row"} spacing={2}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateTemplateDialogOpen(true)}
              fullWidth={isMobile}
            >
              Create Template
            </Button>
            <Button
              variant="contained"
              startIcon={<SOPIcon />}
              onClick={() => setCreateSOPDialogOpen(true)}
              fullWidth={isMobile}
            >
              Assign to Property
            </Button>
          </Stack>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* SOP Templates Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            SOP Templates
          </Typography>
          
          {/* Simple table just like Properties */}
          {isMobile ? (
            // Mobile Card View
            <Grid container spacing={2}>
              {sopTemplates.map((template) => (
                <Grid item xs={12} key={template.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box flex={1}>
                          <Typography variant="h6">
                            {template.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {template.description}
                          </Typography>
                          <Chip
                            label={template.category}
                            size="small"
                            color="primary"
                          />
                        </Box>
                        <Chip
                          label={template.is_active ? 'Active' : 'Inactive'}
                          color={template.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary">
                        Created: {formatDate(template.created_at)}
                      </Typography>

                      <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/sops/${template.id}/edit`)}>
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleDeleteClick(template)}
                          startIcon={<DeleteIcon />}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {sopTemplates.length === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      No SOP templates found. Create your first template to get started.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          ) : (
            // Desktop Table View
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Template Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sopTemplates.map((template) => (
                    <TableRow key={template.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {template.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {template.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={template.category}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={template.is_active ? 'Active' : 'Inactive'}
                          color={template.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(template.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Edit Template">
                            <IconButton size="small" onClick={() => navigate(`/sops/${template.id}/edit`)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Template">
                            <IconButton 
                              size="small"
                              onClick={() => handleDeleteClick(template)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sopTemplates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No SOP templates found. Create your first template to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Property SOPs Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Property SOPs
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Property</TableCell>
                  <TableCell>SOP Template</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Due Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {propertySops.map((sop) => (
                  <TableRow key={sop.id}>
                    <TableCell>{sop.property_name}</TableCell>
                    <TableCell>{sop.template_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={sop.status}
                        color={getStatusColor(sop.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{sop.assigned_to_name}</TableCell>
                    <TableCell>{sop.due_date ? formatDate(sop.due_date) : 'N/A'}</TableCell>
                  </TableRow>
                ))}
                {propertySops.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No SOPs have been assigned to properties yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Create Template Dialog */}
        <Dialog 
          open={createTemplateDialogOpen} 
          onClose={() => setCreateTemplateDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>Create SOP Template</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Template Name"
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              
              <TextField
                fullWidth
                label="Description"
                value={templateFormData.description}
                onChange={(e) => setTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
              />

              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={templateFormData.category}
                  onChange={(e) => setTemplateFormData(prev => ({ ...prev, category: e.target.value }))}
                  label="Category"
                >
                  <MenuItem value="procedure">Procedure</MenuItem>
                  <MenuItem value="safety">Safety</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                  <MenuItem value="compliance">Compliance</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setCreateTemplateDialogOpen(false); resetTemplateForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTemplate} 
              variant="contained"
              disabled={formLoading || !templateFormData.name || !templateFormData.category}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Create Template'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assign SOP Dialog */}
        <Dialog
          open={createSOPDialogOpen}
          onClose={() => setCreateSOPDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>Assign SOP to Property</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth required>
                <InputLabel>Property</InputLabel>
                <Select
                  value={sopFormData.property_id || ''}
                  onChange={(e) => setSOPFormData(prev => ({ ...prev, property_id: Number(e.target.value) }))}
                  label="Property"
                >
                  {properties.map(property => (
                    <MenuItem key={property.id} value={property.id}>
                      {property.name} - {property.address}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth required>
                <InputLabel>SOP Template</InputLabel>
                <Select
                  value={sopFormData.template_id || ''}
                  onChange={(e) => setSOPFormData(prev => ({ ...prev, template_id: Number(e.target.value) }))}
                  label="SOP Template"
                >
                  {sopTemplates.filter(t => t.is_active).map(template => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={sopFormData.due_date || ''}
                onChange={(e) => setSOPFormData(prev => ({ ...prev, due_date: e.target.value || undefined }))}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateSOPDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreatePropertySOP} 
              variant="contained"
              disabled={formLoading || !sopFormData.property_id || !sopFormData.template_id}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Assign SOP'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete SOP Template</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this SOP template?
            </Typography>
            {selectedTemplate && (
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Template:</strong> {selectedTemplate.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Category:</strong> {selectedTemplate.category}
                </Typography>
              </Box>
            )}
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action cannot be undone. All property assignments using this template will be affected.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancel</Button>
            <Button 
              onClick={handleDeleteConfirm} 
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

export default SOPs;