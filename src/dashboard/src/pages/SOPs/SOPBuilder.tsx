import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  KeyboardArrowUp as MoveUpIcon,
  KeyboardArrowDown as MoveDownIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import {
  SOPTemplate,
  CreateSOPTemplateData,
  UpdateSOPTemplateData
} from '../../types/sop.types';
import { sopService } from '../../services/sop.service';

// Define types for form state
type SOPCategoryType = string;

interface StepFormData {
  id?: number;
  tempId?: string;
  item_text: string;
  item_type: string;
  is_required: boolean;
}

interface SOPFormData {
  name: string;
  description?: string;
  category: SOPCategoryType;
  is_active: boolean;
  items: StepFormData[];
}

const SOPBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<SOPFormData>({
    name: '',
    description: '',
    category: 'maintenance',
    is_active: true,
    items: []
  });
  
  // Step editing state
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<StepFormData | null>(null);
  const [stepFormData, setStepFormData] = useState<StepFormData>({
    item_text: '',
    item_type: 'text',
    is_required: true
  });
  
  const [nextTempId, setNextTempId] = useState(1);

  useEffect(() => {
    if (isEdit && id) {
      loadSOP();
    }
  }, [id, isEdit]);

  const loadSOP = async () => {
    try {
      setLoading(true);
      setError(null);
      const sop = await sopService.getSOPTemplateById(Number(id));
      
      const items: StepFormData[] = (sop.items || []).map(item => ({
        id: item.id,
        item_text: item.item_text,
        item_type: item.item_type,
        is_required: item.is_required,
      }));
      
      setFormData({
        name: sop.name,
        description: sop.description || '',
        category: sop.category,
        is_active: sop.is_active,
        items
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load SOP');
      console.error('Error loading SOP:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('SOP name is required');
      return;
    }
    
    if (formData.items.length === 0) {
      setError('At least one item is required for an SOP');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const sopData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        category: formData.category,
        is_active: formData.is_active,
        items: formData.items.map((item, index) => ({
          id: item.id,
          item_text: item.item_text,
          item_type: item.item_type,
          is_required: item.is_required,
          sort_order: index
        }))
      };
      
      let sopId: number;
      
      if (isEdit && id) {
        const updatedSOP = await sopService.updateSOPTemplate(Number(id), sopData);
        sopId = updatedSOP.id;
      } else {
        const newSOP = await sopService.createSOPTemplate(sopData as CreateSOPTemplateData);
        sopId = newSOP.id;
      }
      
      // Navigate to the SOP detail page
      navigate(`/sops/${sopId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save SOP');
      console.error('Error saving SOP:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = () => {
    setEditingStep(null);
    setStepFormData({
      item_text: '',
      item_type: 'text',
      is_required: true,
    });
    setStepDialogOpen(true);
  };

  const handleEditStep = (step: StepFormData) => {
    setEditingStep(step);
    setStepFormData({ ...step });
    setStepDialogOpen(true);
  };

  const handleSaveStep = () => {
    if (!stepFormData.item_text.trim()) {
      return;
    }

    if (editingStep) {
      // Update existing step
      const updatedItems = formData.items.map(item => 
        (item.id === editingStep.id || item.tempId === editingStep.tempId) 
          ? { ...stepFormData, id: editingStep.id, tempId: editingStep.tempId }
          : item
      );
      setFormData(prev => ({ ...prev, items: updatedItems }));
    } else {
      // Add new step
      const newItem: StepFormData = {
        ...stepFormData,
        tempId: `temp-${nextTempId}`
      };
      setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
      setNextTempId(prev => prev + 1);
    }

    setStepDialogOpen(false);
    setEditingStep(null);
  };

  const handleDeleteStep = (step: StepFormData) => {
    const updatedItems = formData.items.filter(s => 
      s.id !== step.id && s.tempId !== step.tempId
    );
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.items.length) return;

    const newItems = [...formData.items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setFormData(prev => ({ ...prev, items: newItems }));
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
        {/* Header */}
        <Box display="flex" flexDirection={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "stretch" : "center"} gap={isMobile ? 2 : 0}>
          <Box>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
              <IconButton onClick={() => navigate('/sops')} sx={{ p: isMobile ? 0.5 : 1 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant={isMobile ? "h6" : "h5"}>
                {isEdit ? 'Edit SOP Template' : 'Create SOP Template'}
              </Typography>
            </Box>
          </Box>
          <Stack direction={isMobile ? "column" : "row"} spacing={1}>
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={() => setPreviewOpen(true)}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
              disabled={formData.items.length === 0}
            >
              Preview
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || !formData.name.trim() || formData.items.length === 0}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
            >
              {saving ? <CircularProgress size={20} /> : (isEdit ? 'Update SOP' : 'Create SOP')}
            </Button>
          </Stack>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* SOP Basic Information */}
        <Paper sx={{ p: isMobile ? 2 : 3 }}>
          <Typography variant="h6" gutterBottom>
            SOP Information
          </Typography>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="SOP Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              error={!formData.name.trim()}
              helperText={!formData.name.trim() ? 'Name is required' : ''}
            />
            
            <TextField
              fullWidth
              label="Description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              placeholder="Describe what this SOP covers and when it should be used..."
            />
            
            <Box display="flex" flexDirection={isMobile ? "column" : "row"} gap={2}>
              <TextField
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. maintenance, safety, operations"
                sx={{ minWidth: 200 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Box>
          </Stack>
        </Paper>

        {/* Steps Section */}
        <Paper sx={{ p: isMobile ? 2 : 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              SOP Items ({formData.items.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddStep}
              size={isMobile ? "small" : "medium"}
            >
              Add Item
            </Button>
          </Box>
          
          {formData.items.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No items added yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add items to define the procedure for this SOP
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {formData.items.map((item, index) => (
                <Card key={item.id || item.tempId}>
                  <CardContent sx={{ py: 2 }}>
                    <Box display="flex" alignItems="flex-start" gap={2}>
                      <Box sx={{ minWidth: 24, mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {index + 1}.
                        </Typography>
                      </Box>
                      
                      <Box sx={{ flexGrow: 1 }}>
                        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                          <AssignmentIcon />
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {item.item_text}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          <Chip
                            label={item.item_type}
                            size="small"
                            variant="outlined"
                          />
                          {item.is_required && (
                            <Chip label="Required" size="small" color="error" />
                          )}
                        </Box>
                      </Box>
                      
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                        >
                          <MoveUpIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => moveStep(index, 'down')}
                          disabled={index === formData.items.length - 1}
                        >
                          <MoveDownIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEditStep(item)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteStep(item)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Step Edit Dialog */}
        <Dialog
          open={stepDialogOpen}
          onClose={() => setStepDialogOpen(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            {editingStep ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Item Text"
                value={stepFormData.item_text}
                onChange={(e) => setStepFormData(prev => ({ ...prev, item_text: e.target.value }))}
                required
                placeholder="Describe what needs to be done in this step..."
              />
              
              <FormControl fullWidth>
                <InputLabel>Item Type</InputLabel>
                <Select
                  value={stepFormData.item_type}
                  onChange={(e) => setStepFormData(prev => ({ ...prev, item_type: e.target.value }))}
                  label="Item Type"
                >
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="checkbox">Checkbox</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={stepFormData.is_required}
                    onChange={(e) => setStepFormData(prev => ({ ...prev, is_required: e.target.checked }))}
                  />
                }
                label="Required Item"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStepDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveStep} 
              variant="contained"
              disabled={!stepFormData.item_text.trim()}
            >
              {editingStep ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>SOP Preview</DialogTitle>
          <DialogContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {formData.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {formData.description || 'No description provided'}
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                  <Chip label={formData.category} color="primary" size="small" />
                  <Chip label={formData.is_active ? 'Active' : 'Inactive'} color={formData.is_active ? 'success' : 'default'} size="small" />
                </Box>
              </Box>
              
              <Divider />
              
              <Box>
                <Typography variant="h6" gutterBottom>
                  Procedure Items ({formData.items.length})
                </Typography>
                <List sx={{ p: 0 }}>
                  {formData.items.map((item, index) => (
                    <React.Fragment key={item.id || item.tempId}>
                      {index > 0 && <Divider />}
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <Typography variant="body2" color="text.secondary">
                            {index + 1}.
                          </Typography>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <AssignmentIcon />
                              <Typography variant="body1">
                                {item.item_text}
                              </Typography>
                              {item.is_required && (
                                <Chip label="Required" size="small" color="error" />
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
};

export default SOPBuilder;