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
  LinearProgress,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  PlayArrow as PlayArrowIcon,
  Description as TemplateIcon,
  Approval as ApprovalIcon
} from '@mui/icons-material';
import { 
  Checklist,
  ChecklistTemplate,
  CreateChecklistData,
  ChecklistFilters,
  ChecklistTemplateFilters
} from '../../types/checklist.types';
import { checklistService } from '../../services/checklist.service';
import { propertyService } from '../../services/property.service';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`checklist-tabpanel-${index}`}
      aria-labelledby={`checklist-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Checklists: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  // Checklist states
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState(true);
  const [checklistsError, setChecklistsError] = useState<string | null>(null);
  const [checklistFilters, setChecklistFilters] = useState<ChecklistFilters>({});
  const [checklistSearchTerm, setChecklistSearchTerm] = useState('');
  const [checklistCount, setChecklistCount] = useState(0);

  // Template states
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [templateFilters, setTemplateFilters] = useState<ChecklistTemplateFilters>({});
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [templateCount, setTemplateCount] = useState(0);

  // Dialog states
  const [createChecklistDialogOpen, setCreateChecklistDialogOpen] = useState(false);
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);

  // Form states
  const [checklistFormData, setChecklistFormData] = useState<CreateChecklistData>({
    template_id: 0,
    property_id: 0,
    assigned_to: undefined,
    due_date: undefined
  });
  const [formLoading, setFormLoading] = useState(false);

  // Properties for dropdowns
  const [properties, setProperties] = useState<any[]>([]);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadChecklists();
  }, [checklistFilters]);

  useEffect(() => {
    loadTemplates();
  }, [templateFilters]);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadChecklists = async () => {
    try {
      setChecklistsLoading(true);
      setChecklistsError(null);
      
      const response = await checklistService.getChecklists(checklistFilters);
      setChecklists(response.data);
      setChecklistCount(response.count);
    } catch (err: any) {
      setChecklistsError(err.response?.data?.message || 'Failed to load checklists');
      console.error('Error loading checklists:', err);
    } finally {
      setChecklistsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      setTemplatesError(null);
      
      const response = await checklistService.getTemplates(templateFilters);
      setTemplates(response.data);
      setTemplateCount(response.count);
    } catch (err: any) {
      setTemplatesError(err.response?.data?.message || 'Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const response = await propertyService.getProperties();
      setProperties(response.data);
    } catch (err: any) {
      console.error('Error loading properties:', err);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateChecklist = async () => {
    try {
      setFormLoading(true);
      await checklistService.createChecklist(checklistFormData);
      setCreateChecklistDialogOpen(false);
      resetChecklistForm();
      loadChecklists();
    } catch (err: any) {
      setChecklistsError(err.response?.data?.message || 'Failed to create checklist');
    } finally {
      setFormLoading(false);
    }
  };

  const resetChecklistForm = () => {
    setChecklistFormData({
      template_id: 0,
      property_id: 0,
      assigned_to: undefined,
      due_date: undefined
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ScheduleIcon />;
      case 'in_progress':
        return <PlayArrowIcon />;
      case 'completed':
        return <CheckCircleIcon />;
      case 'approved':
        return <ApprovalIcon />;
      case 'rejected':
        return <WarningIcon />;
      default:
        return <AssignmentIcon />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (checklistsLoading && checklists.length === 0 && templatesLoading && templates.length === 0) {
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
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom>
              Checklists
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Manage security audit checklists and templates
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<TemplateIcon />}
              onClick={() => setCreateTemplateDialogOpen(true)}
            >
              New Template
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateChecklistDialogOpen(true)}
            >
              New Checklist
            </Button>
          </Stack>
        </Box>

        {/* Error Alerts */}
        {checklistsError && (
          <Alert severity="error" onClose={() => setChecklistsError(null)}>
            {checklistsError}
          </Alert>
        )}
        {templatesError && (
          <Alert severity="error" onClose={() => setTemplatesError(null)}>
            {templatesError}
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="checklist tabs">
              <Tab 
                label={
                  <Badge badgeContent={checklistCount} color="primary">
                    Active Checklists
                  </Badge>
                } 
                id="checklist-tab-0"
                aria-controls="checklist-tabpanel-0"
              />
              <Tab 
                label={
                  <Badge badgeContent={templateCount} color="secondary">
                    Templates
                  </Badge>
                } 
                id="checklist-tab-1"
                aria-controls="checklist-tabpanel-1"
              />
            </Tabs>
          </Box>

          {/* Active Checklists Tab */}
          <TabPanel value={activeTab} index={0}>
            <Stack spacing={3}>
              {/* Checklist Filters */}
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    placeholder="Search checklists..."
                    value={checklistSearchTerm}
                    onChange={(e) => setChecklistSearchTerm(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <IconButton onClick={() => {}}>
                          <SearchIcon />
                        </IconButton>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={checklistFilters.status || ''}
                      onChange={(e) => setChecklistFilters((prev: ChecklistFilters) => ({ ...prev, status: e.target.value || undefined }))}
                      label="Status"
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      {checklistService.getChecklistStatuses().map(status => (
                        <MenuItem key={status} value={status}>
                          {checklistService.formatStatus(status)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Property</InputLabel>
                    <Select
                      value={checklistFilters.property_id || ''}
                      onChange={(e) => setChecklistFilters((prev: ChecklistFilters) => ({ ...prev, property_id: e.target.value ? Number(e.target.value) : undefined }))}
                      label="Property"
                    >
                      <MenuItem value="">All Properties</MenuItem>
                      {properties.map(property => (
                        <MenuItem key={property.id} value={property.id}>
                          {property.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Stack direction="row" spacing={1}>
                    <Button 
                      onClick={() => setChecklistFilters({})} 
                      variant="outlined" 
                      size="small"
                    >
                      Clear
                    </Button>
                    <IconButton onClick={loadChecklists} disabled={checklistsLoading}>
                      <RefreshIcon />
                    </IconButton>
                  </Stack>
                </Grid>
              </Grid>

              {/* Checklists Table */}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Checklist</TableCell>
                      <TableCell>Property</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {checklists.map((checklist) => (
                      <TableRow key={checklist.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getStatusIcon(checklist.status)}
                            <Box>
                              <Typography variant="subtitle2" fontWeight="medium">
                                {checklist.template?.name || `Checklist #${checklist.id}`}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Created {formatDate(checklist.created_at)}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {checklist.property?.name || 'Unknown Property'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {checklist.property?.address}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={checklistService.formatStatus(checklist.status)}
                            color={checklistService.getStatusColor(checklist.status)}
                            size="small"
                          />
                          {checklistService.isOverdue(checklist) && (
                            <Chip
                              label="Overdue"
                              color="error"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ width: '100%' }}>
                            <LinearProgress
                              variant="determinate"
                              value={checklistService.calculateProgress(checklist)}
                              sx={{ mb: 1 }}
                            />
                            <Typography variant="caption">
                              {checklistService.calculateProgress(checklist)}% Complete
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {checklist.assigned_user ? (
                            <Typography variant="body2">
                              {checklist.assigned_user.first_name} {checklist.assigned_user.last_name}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Unassigned
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {checklist.due_date ? (
                            <Typography variant="body2">
                              {formatDate(checklist.due_date)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No due date
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="View Details">
                              <IconButton size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Checklist">
                              <IconButton size="small">
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Checklist">
                              <IconButton size="small">
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {checklists.length === 0 && !checklistsLoading && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography variant="body1" color="text.secondary">
                            No checklists found. Create your first checklist to get started.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </TabPanel>

          {/* Templates Tab */}
          <TabPanel value={activeTab} index={1}>
            <Stack spacing={3}>
              {/* Template Filters */}
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    placeholder="Search templates..."
                    value={templateSearchTerm}
                    onChange={(e) => setTemplateSearchTerm(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <IconButton onClick={() => {}}>
                          <SearchIcon />
                        </IconButton>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={templateFilters.category || ''}
                      onChange={(e) => setTemplateFilters((prev: ChecklistTemplateFilters) => ({ ...prev, category: e.target.value || undefined }))}
                      label="Category"
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {checklistService.getChecklistCategories().map(category => (
                        <MenuItem key={category} value={category}>
                          {checklistService.formatCategory(category)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Property Type</InputLabel>
                    <Select
                      value={templateFilters.property_type || ''}
                      onChange={(e) => setTemplateFilters((prev: ChecklistTemplateFilters) => ({ ...prev, property_type: e.target.value || undefined }))}
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
                  <Stack direction="row" spacing={1}>
                    <Button 
                      onClick={() => setTemplateFilters({})} 
                      variant="outlined" 
                      size="small"
                    >
                      Clear
                    </Button>
                    <IconButton onClick={loadTemplates} disabled={templatesLoading}>
                      <RefreshIcon />
                    </IconButton>
                  </Stack>
                </Grid>
              </Grid>

              {/* Templates Grid */}
              <Grid container spacing={3}>
                {templates.map((template) => (
                  <Grid item xs={12} md={6} lg={4} key={template.id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="between" alignItems="flex-start" mb={2}>
                          <Box flex={1}>
                            <Typography variant="h6" gutterBottom>
                              {template.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {template.description}
                            </Typography>
                          </Box>
                          <Chip
                            label={checklistService.formatCategory(template.category)}
                            size="small"
                            color="primary"
                          />
                        </Box>
                        
                        <Stack spacing={1} mb={2}>
                          <Typography variant="caption" color="text.secondary">
                            Property Type: {template.property_type ? propertyService.formatPropertyType(template.property_type) : 'All Types'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Items: {template.items?.length || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created: {formatDate(template.created_at)}
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="View Template">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Template">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Create Checklist">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => {
                                setChecklistFormData((prev: CreateChecklistData) => ({ ...prev, template_id: template.id }));
                                setCreateChecklistDialogOpen(true);
                              }}
                            >
                              <AddIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {templates.length === 0 && !templatesLoading && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        No templates found. Create your first template to get started.
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Stack>
          </TabPanel>
        </Paper>

        {/* Create Checklist Dialog */}
        <Dialog open={createChecklistDialogOpen} onClose={() => setCreateChecklistDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Checklist</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth required>
                <InputLabel>Template</InputLabel>
                <Select
                  value={checklistFormData.template_id || ''}
                  onChange={(e) => setChecklistFormData((prev: CreateChecklistData) => ({ ...prev, template_id: Number(e.target.value) }))}
                  label="Template"
                >
                  {templates.map(template => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name} ({checklistService.formatCategory(template.category)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth required>
                <InputLabel>Property</InputLabel>
                <Select
                  value={checklistFormData.property_id || ''}
                  onChange={(e) => setChecklistFormData((prev: CreateChecklistData) => ({ ...prev, property_id: Number(e.target.value) }))}
                  label="Property"
                >
                  {properties.map(property => (
                    <MenuItem key={property.id} value={property.id}>
                      {property.name} - {property.address}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={checklistFormData.due_date || ''}
                onChange={(e) => setChecklistFormData((prev: CreateChecklistData) => ({ ...prev, due_date: e.target.value || undefined }))}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateChecklistDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateChecklist} 
              variant="contained"
              disabled={formLoading || !checklistFormData.template_id || !checklistFormData.property_id}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Create Checklist'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
};

export default Checklists;
