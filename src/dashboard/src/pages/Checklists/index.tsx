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
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider
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
  Approval as ApprovalIcon,
  Close as CloseIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { 
  Checklist,
  ChecklistTemplate,
  CreateChecklistData,
  ChecklistFilters,
  ChecklistTemplateFilters,
  ChecklistTemplateItem,
  CreateChecklistTemplateData,
  CreateChecklistTemplateItemData,
  UpdateChecklistTemplateData
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
  const navigate = useNavigate();
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
  const [viewTemplateDialogOpen, setViewTemplateDialogOpen] = useState(false);
  const [editTemplateDialogOpen, setEditTemplateDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);

  // Form states
  const [checklistFormData, setChecklistFormData] = useState<CreateChecklistData>({
    template_id: 0,
    property_id: 0,
    assigned_to: undefined,
    due_date: undefined
  });
  const [templateFormData, setTemplateFormData] = useState<CreateChecklistTemplateData>({
    name: '',
    description: '',
    category: '',
    items: [],
    is_scheduled: false,
    schedule_frequency: 'monthly',
    schedule_interval: 1,
    schedule_days_of_week: [],
    schedule_day_of_month: 1,
    schedule_time: '09:00',
    schedule_start_date: '',
    schedule_end_date: '',
    schedule_advance_days: 0,
    auto_assign: false
  });
  const [formLoading, setFormLoading] = useState(false);

  // Properties for dropdowns
  const [properties, setProperties] = useState<any[]>([]);
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<Checklist | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Template delete dialog
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ChecklistTemplate | null>(null);
  const [deleteTemplateLoading, setDeleteTemplateLoading] = useState(false);

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

  const handleCreateTemplate = async () => {
    try {
      setFormLoading(true);
      await checklistService.createTemplate(templateFormData);
      setCreateTemplateDialogOpen(false);
      resetTemplateForm();
      loadTemplates();
      setTemplatesError(null);
    } catch (err: any) {
      setTemplatesError(err.response?.data?.message || 'Failed to create template');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      setFormLoading(true);
      const updateData: UpdateChecklistTemplateData = {
        name: templateFormData.name,
        description: templateFormData.description,
        category: templateFormData.category,
        items: templateFormData.items
      };
      await checklistService.updateTemplate(selectedTemplate.id, updateData);
      setEditTemplateDialogOpen(false);
      resetTemplateForm();
      loadTemplates();
      setTemplatesError(null);
    } catch (err: any) {
      setTemplatesError(err.response?.data?.message || 'Failed to update template');
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

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      description: '',
      category: '',
      items: [],
      is_scheduled: false,
      schedule_frequency: 'monthly',
      schedule_interval: 1,
      schedule_days_of_week: [],
      schedule_day_of_month: 1,
      schedule_time: '09:00',
      schedule_start_date: '',
      schedule_end_date: '',
      schedule_advance_days: 0,
      auto_assign: false
    });
  };

  const handleDeleteClick = (checklist: Checklist) => {
    setChecklistToDelete(checklist);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!checklistToDelete) return;

    try {
      setDeleteLoading(true);
      await checklistService.deleteChecklist(checklistToDelete.id);
      setDeleteDialogOpen(false);
      setChecklistToDelete(null);
      loadChecklists();
      setChecklistsError(null);
    } catch (err: any) {
      setChecklistsError(err.response?.data?.message || 'Failed to delete checklist');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setChecklistToDelete(null);
  };

  const handleDeleteTemplateClick = (template: ChecklistTemplate) => {
    setTemplateToDelete(template);
    setDeleteTemplateDialogOpen(true);
  };

  const handleDeleteTemplateConfirm = async () => {
    if (!templateToDelete) return;

    try {
      setDeleteTemplateLoading(true);
      await checklistService.deleteTemplate(templateToDelete.id);
      setDeleteTemplateDialogOpen(false);
      setTemplateToDelete(null);
      loadTemplates();
      setTemplatesError(null);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setTemplatesError('Cannot delete template: It is currently being used by one or more checklists.');
      } else {
        setTemplatesError(err.response?.data?.message || 'Failed to delete template');
      }
      setDeleteTemplateDialogOpen(false);
      setTemplateToDelete(null);
    } finally {
      setDeleteTemplateLoading(false);
    }
  };

  const handleDeleteTemplateCancel = () => {
    setDeleteTemplateDialogOpen(false);
    setTemplateToDelete(null);
  };

  const handleViewTemplate = async (template: ChecklistTemplate) => {
    try {
      // Fetch the full template with items
      const fullTemplate = await checklistService.getTemplateById(template.id);
      
      // Transform items to match frontend expectations
      if (fullTemplate.items) {
        fullTemplate.items = fullTemplate.items.map((item: any) => ({
          ...item,
          title: item.item_text || item.title, // Use item_text from backend or fallback to title
          description: item.config_json?.description || item.description || ''
        }));
      }
      
      setSelectedTemplate(fullTemplate);
      setViewTemplateDialogOpen(true);
    } catch (error) {
      console.error('Error loading template:', error);
      setTemplatesError('Failed to load template details');
    }
  };

  const handleEditTemplate = async (template: ChecklistTemplate) => {
    try {
      // Fetch the full template with items
      const fullTemplate = await checklistService.getTemplateById(template.id);
      
      setSelectedTemplate(fullTemplate);
      
      // Convert template items to form data format
      const items: CreateChecklistTemplateItemData[] = (fullTemplate.items || []).map((item: any, index) => ({
        title: item.item_text || item.title, // Use item_text from backend
        description: item.config_json?.description || item.description || '',
        item_type: item.item_type,
        is_required: item.is_required,
        requires_approval: item.requires_approval || false,
        order_index: item.sort_order || item.order_index || index,
        validation_rules: item.config_json?.validation_rules || item.validation_rules
      }));
      
      setTemplateFormData({
        name: fullTemplate.name,
        description: fullTemplate.description || '',
        category: fullTemplate.category,
        items,
        is_scheduled: fullTemplate.is_scheduled || false,
        schedule_frequency: fullTemplate.schedule_frequency || 'monthly',
        schedule_interval: fullTemplate.schedule_interval || 1,
        schedule_days_of_week: fullTemplate.schedule_days_of_week || [],
        schedule_day_of_month: fullTemplate.schedule_day_of_month || 1,
        schedule_time: fullTemplate.schedule_time || '09:00',
        schedule_start_date: fullTemplate.schedule_start_date || '',
        schedule_end_date: fullTemplate.schedule_end_date || '',
        schedule_advance_days: fullTemplate.schedule_advance_days || 0,
        auto_assign: fullTemplate.auto_assign || false
      });
      setEditTemplateDialogOpen(true);
    } catch (error) {
      console.error('Error loading template:', error);
      setTemplatesError('Failed to load template details');
    }
  };

  const handleAddTemplateItem = () => {
    const newItem: CreateChecklistTemplateItemData = {
      title: '',
      description: '',
      item_type: 'text',
      is_required: true,
      requires_approval: false,
      order_index: templateFormData.items.length
    };
    setTemplateFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const handleRemoveTemplateItem = (index: number) => {
    setTemplateFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateTemplateItem = (index: number, field: keyof CreateChecklistTemplateItemData, value: any) => {
    setTemplateFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
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
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        setChecklistFilters(prev => ({ ...prev, search: checklistSearchTerm }));
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <IconButton onClick={() => setChecklistFilters(prev => ({ ...prev, search: checklistSearchTerm }))}>
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
                      onClick={() => {
                        setChecklistFilters({});
                        setChecklistSearchTerm('');
                      }} 
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
                                {checklist.template_name || `Checklist #${checklist.id}`}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Created {formatDate(checklist.created_at)}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {checklist.property_name || 'Unknown Property'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {checklist.property_address}
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
                              value={checklist.completion_stats?.completion_percentage || 0}
                              sx={{ mb: 1 }}
                            />
                            <Typography variant="caption">
                              {checklist.completion_stats?.completion_percentage || 0}% Complete
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {checklist.assigned_to_email ? (
                            <Typography variant="body2">
                              {checklist.assigned_to_email}
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
                              <IconButton 
                                size="small"
                                onClick={() => navigate(`/checklists/${checklist.id}`)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Checklist">
                              <IconButton 
                                size="small"
                                onClick={() => navigate(`/checklists/${checklist.id}/edit`)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Checklist">
                              <IconButton 
                                size="small"
                                onClick={() => handleDeleteClick(checklist)}
                              >
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
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        setTemplateFilters(prev => ({ ...prev, search: templateSearchTerm }));
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <IconButton onClick={() => setTemplateFilters(prev => ({ ...prev, search: templateSearchTerm }))}>
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
                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={1}>
                    <Button 
                      onClick={() => {
                        setTemplateFilters({});
                        setTemplateSearchTerm('');
                      }} 
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
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
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
                            Items: {template.items?.length || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created: {formatDate(template.created_at)}
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="View Template">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewTemplate(template)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Template">
                            <IconButton 
                              size="small"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Template">
                            <IconButton 
                              size="small"
                              onClick={() => handleDeleteTemplateClick(template)}
                              color="error"
                            >
                              <DeleteIcon />
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

        {/* Create Template Dialog */}
        <Dialog 
          open={createTemplateDialogOpen} 
          onClose={() => setCreateTemplateDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: { maxHeight: '90vh' }
          }}
        >
          <DialogTitle>Create New Template</DialogTitle>
          <DialogContent sx={{ overflow: 'auto' }}>
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
                rows={2}
              />

              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={templateFormData.category}
                  onChange={(e) => setTemplateFormData(prev => ({ ...prev, category: e.target.value }))}
                  label="Category"
                >
                  {checklistService.getChecklistCategories().map(category => (
                    <MenuItem key={category} value={category}>
                      {checklistService.formatCategory(category)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider />
              
              {/* Scheduling Section */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Scheduling Configuration
                </Typography>
                
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Enable Scheduling</InputLabel>
                    <Select
                      value={templateFormData.is_scheduled ? 'yes' : 'no'}
                      onChange={(e) => setTemplateFormData(prev => ({ ...prev, is_scheduled: e.target.value === 'yes' }))}
                      label="Enable Scheduling"
                    >
                      <MenuItem value="no">No - Manual Creation Only</MenuItem>
                      <MenuItem value="yes">Yes - Automatically Generate Checklists</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {templateFormData.is_scheduled && (
                    <Collapse in={templateFormData.is_scheduled}>
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                              <InputLabel>Frequency</InputLabel>
                              <Select
                                value={templateFormData.schedule_frequency}
                                onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_frequency: e.target.value as any }))}
                                label="Frequency"
                              >
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="weekly">Weekly</MenuItem>
                                <MenuItem value="bi-weekly">Bi-Weekly</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                                <MenuItem value="quarterly">Quarterly</MenuItem>
                                <MenuItem value="yearly">Yearly</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Interval"
                              type="number"
                              value={templateFormData.schedule_interval}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_interval: parseInt(e.target.value) || 1 }))}
                              inputProps={{ min: 1, max: 12 }}
                              helperText="Every X frequency periods"
                            />
                          </Grid>
                        </Grid>
                        
                        {(templateFormData.schedule_frequency === 'weekly' || templateFormData.schedule_frequency === 'bi-weekly') && (
                          <FormControl fullWidth>
                            <InputLabel>Days of Week</InputLabel>
                            <Select
                              multiple
                              value={templateFormData.schedule_days_of_week}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_days_of_week: e.target.value as number[] }))}
                              label="Days of Week"
                            >
                              <MenuItem value={0}>Sunday</MenuItem>
                              <MenuItem value={1}>Monday</MenuItem>
                              <MenuItem value={2}>Tuesday</MenuItem>
                              <MenuItem value={3}>Wednesday</MenuItem>
                              <MenuItem value={4}>Thursday</MenuItem>
                              <MenuItem value={5}>Friday</MenuItem>
                              <MenuItem value={6}>Saturday</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                        
                        {(templateFormData.schedule_frequency === 'monthly' || templateFormData.schedule_frequency === 'quarterly' || templateFormData.schedule_frequency === 'yearly') && (
                          <TextField
                            fullWidth
                            label="Day of Month"
                            type="number"
                            value={templateFormData.schedule_day_of_month}
                            onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_day_of_month: parseInt(e.target.value) || 1 }))}
                            inputProps={{ min: 1, max: 31 }}
                            helperText="Day of the month to generate checklist"
                          />
                        )}
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Generation Time"
                              type="time"
                              value={templateFormData.schedule_time}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Advance Days"
                              type="number"
                              value={templateFormData.schedule_advance_days}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_advance_days: parseInt(e.target.value) || 0 }))}
                              inputProps={{ min: 0, max: 30 }}
                              helperText="Generate X days in advance"
                            />
                          </Grid>
                        </Grid>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Start Date"
                              type="date"
                              value={templateFormData.schedule_start_date}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_start_date: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="End Date (Optional)"
                              type="date"
                              value={templateFormData.schedule_end_date}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_end_date: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                        </Grid>
                        
                        <FormControl fullWidth>
                          <InputLabel>Auto-assign</InputLabel>
                          <Select
                            value={templateFormData.auto_assign ? 'yes' : 'no'}
                            onChange={(e) => setTemplateFormData(prev => ({ ...prev, auto_assign: e.target.value === 'yes' }))}
                            label="Auto-assign"
                          >
                            <MenuItem value="no">No - Leave Unassigned</MenuItem>
                            <MenuItem value="yes">Yes - Auto-assign to Property Manager</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                    </Collapse>
                  )}
                </Stack>
              </Box>

              <Divider />
              
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1">Checklist Items</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddTemplateItem}
                    size="small"
                  >
                    Add Item
                  </Button>
                </Box>
                
                {templateFormData.items.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                    No items added yet. Click "Add Item" to create checklist items.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {templateFormData.items.map((item, index) => (
                      <Paper key={index} sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Item Title"
                              value={item.title}
                              onChange={(e) => handleUpdateTemplateItem(index, 'title', e.target.value)}
                              required
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Description"
                              value={item.description}
                              onChange={(e) => handleUpdateTemplateItem(index, 'description', e.target.value)}
                              multiline
                              rows={2}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Type</InputLabel>
                              <Select
                                value={item.item_type}
                                onChange={(e) => handleUpdateTemplateItem(index, 'item_type', e.target.value)}
                                label="Type"
                              >
                                <MenuItem value="text">Text</MenuItem>
                                <MenuItem value="number">Number</MenuItem>
                                <MenuItem value="boolean">Yes/No</MenuItem>
                                <MenuItem value="file">File</MenuItem>
                                <MenuItem value="photo">Photo</MenuItem>
                                <MenuItem value="signature">Signature</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Required</InputLabel>
                              <Select
                                value={item.is_required ? 'yes' : 'no'}
                                onChange={(e) => handleUpdateTemplateItem(index, 'is_required', e.target.value === 'yes')}
                                label="Required"
                              >
                                <MenuItem value="yes">Yes</MenuItem>
                                <MenuItem value="no">No</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Approval</InputLabel>
                              <Select
                                value={item.requires_approval ? 'yes' : 'no'}
                                onChange={(e) => handleUpdateTemplateItem(index, 'requires_approval', e.target.value === 'yes')}
                                label="Approval"
                              >
                                <MenuItem value="yes">Yes</MenuItem>
                                <MenuItem value="no">No</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={1}>
                            <IconButton
                              onClick={() => handleRemoveTemplateItem(index)}
                              color="error"
                              size="small"
                            >
                              <RemoveIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setCreateTemplateDialogOpen(false); resetTemplateForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTemplate} 
              variant="contained"
              disabled={formLoading || !templateFormData.name || !templateFormData.category || templateFormData.items.length === 0}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Create Template'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Template Dialog */}
        <Dialog 
          open={viewTemplateDialogOpen} 
          onClose={() => setViewTemplateDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: { maxHeight: '90vh' }
          }}
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Template Details</Typography>
              <IconButton onClick={() => setViewTemplateDialogOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ overflow: 'auto' }}>
            {selectedTemplate && (
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="h5" gutterBottom>{selectedTemplate.name}</Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {selectedTemplate.description}
                  </Typography>
                  <Chip 
                    label={checklistService.formatCategory(selectedTemplate.category)} 
                    color="primary" 
                    size="small" 
                  />
                </Box>

                <Divider />

                <Box>
                  <Typography variant="h6" gutterBottom>
                    Checklist Items ({selectedTemplate.items?.length || 0})
                  </Typography>
                  <List>
                    {selectedTemplate.items?.map((item, index) => (
                      <ListItem key={item.id} divider>
                        <ListItemIcon>
                          <Typography variant="body2" color="text.secondary">
                            {index + 1}.
                          </Typography>
                        </ListItemIcon>
                        <ListItemText
                          primary={item.title}
                          secondary={
                            <Stack spacing={0.5}>
                              {item.description && (
                                <Typography variant="body2" color="text.secondary">
                                  {item.description}
                                </Typography>
                              )}
                              <Stack direction="row" spacing={1}>
                                <Chip label={item.item_type} size="small" variant="outlined" />
                                {item.is_required && <Chip label="Required" size="small" color="error" />}
                                {item.requires_approval && <Chip label="Requires Approval" size="small" color="warning" />}
                              </Stack>
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewTemplateDialogOpen(false)}>Close</Button>
            <Button 
              onClick={() => {
                setViewTemplateDialogOpen(false);
                if (selectedTemplate) {
                  handleEditTemplate(selectedTemplate);
                }
              }}
              variant="contained"
              startIcon={<EditIcon />}
            >
              Edit Template
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Template Dialog */}
        <Dialog 
          open={editTemplateDialogOpen} 
          onClose={() => setEditTemplateDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: { maxHeight: '90vh' }
          }}
        >
          <DialogTitle>Edit Template</DialogTitle>
          <DialogContent sx={{ overflow: 'auto' }}>
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
                rows={2}
              />

              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={templateFormData.category}
                  onChange={(e) => setTemplateFormData(prev => ({ ...prev, category: e.target.value }))}
                  label="Category"
                >
                  {checklistService.getChecklistCategories().map(category => (
                    <MenuItem key={category} value={category}>
                      {checklistService.formatCategory(category)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider />
              
              {/* Scheduling Section */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Scheduling Configuration
                </Typography>
                
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Enable Scheduling</InputLabel>
                    <Select
                      value={templateFormData.is_scheduled ? 'yes' : 'no'}
                      onChange={(e) => setTemplateFormData(prev => ({ ...prev, is_scheduled: e.target.value === 'yes' }))}
                      label="Enable Scheduling"
                    >
                      <MenuItem value="no">No - Manual Creation Only</MenuItem>
                      <MenuItem value="yes">Yes - Automatically Generate Checklists</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {templateFormData.is_scheduled && (
                    <Collapse in={templateFormData.is_scheduled}>
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                              <InputLabel>Frequency</InputLabel>
                              <Select
                                value={templateFormData.schedule_frequency}
                                onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_frequency: e.target.value as any }))}
                                label="Frequency"
                              >
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="weekly">Weekly</MenuItem>
                                <MenuItem value="bi-weekly">Bi-Weekly</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                                <MenuItem value="quarterly">Quarterly</MenuItem>
                                <MenuItem value="yearly">Yearly</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Interval"
                              type="number"
                              value={templateFormData.schedule_interval}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_interval: parseInt(e.target.value) || 1 }))}
                              inputProps={{ min: 1, max: 12 }}
                              helperText="Every X frequency periods"
                            />
                          </Grid>
                        </Grid>
                        
                        {(templateFormData.schedule_frequency === 'weekly' || templateFormData.schedule_frequency === 'bi-weekly') && (
                          <FormControl fullWidth>
                            <InputLabel>Days of Week</InputLabel>
                            <Select
                              multiple
                              value={templateFormData.schedule_days_of_week}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_days_of_week: e.target.value as number[] }))}
                              label="Days of Week"
                            >
                              <MenuItem value={0}>Sunday</MenuItem>
                              <MenuItem value={1}>Monday</MenuItem>
                              <MenuItem value={2}>Tuesday</MenuItem>
                              <MenuItem value={3}>Wednesday</MenuItem>
                              <MenuItem value={4}>Thursday</MenuItem>
                              <MenuItem value={5}>Friday</MenuItem>
                              <MenuItem value={6}>Saturday</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                        
                        {(templateFormData.schedule_frequency === 'monthly' || templateFormData.schedule_frequency === 'quarterly' || templateFormData.schedule_frequency === 'yearly') && (
                          <TextField
                            fullWidth
                            label="Day of Month"
                            type="number"
                            value={templateFormData.schedule_day_of_month}
                            onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_day_of_month: parseInt(e.target.value) || 1 }))}
                            inputProps={{ min: 1, max: 31 }}
                            helperText="Day of the month to generate checklist"
                          />
                        )}
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Generation Time"
                              type="time"
                              value={templateFormData.schedule_time}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Advance Days"
                              type="number"
                              value={templateFormData.schedule_advance_days}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_advance_days: parseInt(e.target.value) || 0 }))}
                              inputProps={{ min: 0, max: 30 }}
                              helperText="Generate X days in advance"
                            />
                          </Grid>
                        </Grid>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Start Date"
                              type="date"
                              value={templateFormData.schedule_start_date}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_start_date: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="End Date (Optional)"
                              type="date"
                              value={templateFormData.schedule_end_date}
                              onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_end_date: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                        </Grid>
                        
                        <FormControl fullWidth>
                          <InputLabel>Auto-assign</InputLabel>
                          <Select
                            value={templateFormData.auto_assign ? 'yes' : 'no'}
                            onChange={(e) => setTemplateFormData(prev => ({ ...prev, auto_assign: e.target.value === 'yes' }))}
                            label="Auto-assign"
                          >
                            <MenuItem value="no">No - Leave Unassigned</MenuItem>
                            <MenuItem value="yes">Yes - Auto-assign to Property Manager</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                    </Collapse>
                  )}
                </Stack>
              </Box>

              <Divider />
              
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1">Checklist Items</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddTemplateItem}
                    size="small"
                  >
                    Add Item
                  </Button>
                </Box>
                
                {templateFormData.items.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                    No items added yet. Click "Add Item" to create checklist items.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {templateFormData.items.map((item, index) => (
                      <Paper key={index} sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Item Title"
                              value={item.title}
                              onChange={(e) => handleUpdateTemplateItem(index, 'title', e.target.value)}
                              required
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Description"
                              value={item.description}
                              onChange={(e) => handleUpdateTemplateItem(index, 'description', e.target.value)}
                              multiline
                              rows={2}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Type</InputLabel>
                              <Select
                                value={item.item_type}
                                onChange={(e) => handleUpdateTemplateItem(index, 'item_type', e.target.value)}
                                label="Type"
                              >
                                <MenuItem value="text">Text</MenuItem>
                                <MenuItem value="number">Number</MenuItem>
                                <MenuItem value="boolean">Yes/No</MenuItem>
                                <MenuItem value="file">File</MenuItem>
                                <MenuItem value="photo">Photo</MenuItem>
                                <MenuItem value="signature">Signature</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Required</InputLabel>
                              <Select
                                value={item.is_required ? 'yes' : 'no'}
                                onChange={(e) => handleUpdateTemplateItem(index, 'is_required', e.target.value === 'yes')}
                                label="Required"
                              >
                                <MenuItem value="yes">Yes</MenuItem>
                                <MenuItem value="no">No</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Approval</InputLabel>
                              <Select
                                value={item.requires_approval ? 'yes' : 'no'}
                                onChange={(e) => handleUpdateTemplateItem(index, 'requires_approval', e.target.value === 'yes')}
                                label="Approval"
                              >
                                <MenuItem value="yes">Yes</MenuItem>
                                <MenuItem value="no">No</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={1}>
                            <IconButton
                              onClick={() => handleRemoveTemplateItem(index)}
                              color="error"
                              size="small"
                            >
                              <RemoveIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setEditTemplateDialogOpen(false); resetTemplateForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateTemplate} 
              variant="contained"
              disabled={formLoading || !templateFormData.name || !templateFormData.category || templateFormData.items.length === 0}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Update Template'}
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
          <DialogTitle>Delete Checklist</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this checklist?
            </Typography>
            {checklistToDelete && (
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Checklist:</strong> {checklistToDelete.template_name || `Checklist #${checklistToDelete.id}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Property:</strong> {checklistToDelete.property_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Status:</strong> {checklistService.formatStatus(checklistToDelete.status)}
                </Typography>
              </Box>
            )}
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action cannot be undone. All checklist data including responses, comments, and attachments will be permanently deleted.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancel</Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error"
              variant="contained"
              disabled={deleteLoading}
            >
              {deleteLoading ? <CircularProgress size={20} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Template Confirmation Dialog */}
        <Dialog 
          open={deleteTemplateDialogOpen} 
          onClose={handleDeleteTemplateCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Template</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this template?
            </Typography>
            {templateToDelete && (
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Template:</strong> {templateToDelete.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Category:</strong> {checklistService.formatCategory(templateToDelete.category)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Items:</strong> {templateToDelete.items?.length || 0}
                </Typography>
              </Box>
            )}
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action cannot be undone. If this template is currently being used by any checklists, the deletion will fail.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteTemplateCancel}>Cancel</Button>
            <Button 
              onClick={handleDeleteTemplateConfirm} 
              color="error"
              variant="contained"
              disabled={deleteTemplateLoading}
            >
              {deleteTemplateLoading ? <CircularProgress size={20} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
};

export default Checklists;
