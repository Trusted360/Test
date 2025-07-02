import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  Comment as CommentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import propertyManagerService, { ActionItem } from '../../services/propertyManager.service';
import { propertyService } from '../../services/property.service';

const ActionItemsReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [properties, setProperties] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    propertyId: '',
    overdue: false
  });
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Update dialog
  const [updateDialog, setUpdateDialog] = useState({
    open: false,
    actionItemId: 0,
    updateNote: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, propertiesData] = await Promise.all([
        propertyManagerService.getActionItems(filters),
        propertyService.getProperties()
      ]);
      setActionItems(itemsData.actionItems);
      setSummary(itemsData.summary);
      setProperties(propertiesData);
    } catch (error) {
      console.error('Failed to load action items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const toggleRowExpansion = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleAddUpdate = async () => {
    if (!updateDialog.updateNote) return;
    
    try {
      await propertyManagerService.updateActionItem(updateDialog.actionItemId, {
        update_type: 'note',
        update_note: updateDialog.updateNote
      });
      setUpdateDialog({ open: false, actionItemId: 0, updateNote: '' });
      loadData();
    } catch (error) {
      console.error('Failed to add update:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'major': return 'warning';
      case 'moderate': return 'info';
      case 'minor': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'blocked': return 'error';
      case 'open': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Action Items Report</Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Open Items</Typography>
              <Typography variant="h4">{summary.open_count || 0}</Typography>
              <Typography variant="body2" color="error">
                ${(summary.estimated_cost || 0).toFixed(0)} estimated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>In Progress</Typography>
              <Typography variant="h4" color="info.main">
                {summary.in_progress_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Critical/Major</Typography>
              <Typography variant="h4" color="error">
                {(summary.critical_count || 0) + (summary.major_count || 0)}
              </Typography>
              <Typography variant="body2">Require urgent attention</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Completed</Typography>
              <Typography variant="h4" color="success.main">
                {summary.completed_count || 0}
              </Typography>
              <Typography variant="body2">
                ${(summary.actual_cost || 0).toFixed(0)} spent
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Severity</InputLabel>
              <Select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                label="Severity"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="major">Major</MenuItem>
                <MenuItem value="moderate">Moderate</MenuItem>
                <MenuItem value="minor">Minor</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Property</InputLabel>
              <Select
                value={filters.propertyId}
                onChange={(e) => handleFilterChange('propertyId', e.target.value)}
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
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant={filters.overdue ? 'contained' : 'outlined'}
              color="error"
              fullWidth
              onClick={() => handleFilterChange('overdue', !filters.overdue)}
            >
              {filters.overdue ? 'Showing Overdue' : 'Show Overdue Only'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Action Items Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Property</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Cost</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {actionItems
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((item) => (
                <React.Fragment key={item.id}>
                  <TableRow>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => toggleRowExpansion(item.id)}
                      >
                        {expandedRows.has(item.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{item.property_name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {item.category}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.severity} 
                        size="small" 
                        color={getSeverityColor(item.severity) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.priority} 
                        size="small" 
                        color={getPriorityColor(item.priority) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.status} 
                        size="small" 
                        color={getStatusColor(item.status) as any}
                      />
                    </TableCell>
                    <TableCell>{item.assignee_name}</TableCell>
                    <TableCell>
                      {item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}
                      {item.due_date && new Date(item.due_date) < new Date() && item.status !== 'completed' && (
                        <Typography variant="caption" color="error" display="block">
                          Overdue
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>${item.cost || 0}</TableCell>
                    <TableCell>
                      <Tooltip title="Add Update">
                        <IconButton 
                          size="small"
                          onClick={() => setUpdateDialog({
                            open: true,
                            actionItemId: item.id,
                            updateNote: ''
                          })}
                        >
                          <CommentIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={10} sx={{ py: 0 }}>
                      <Collapse in={expandedRows.has(item.id)} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Description
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {item.description}
                          </Typography>
                          
                          <Typography variant="subtitle2" gutterBottom>
                            Details
                          </Typography>
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} sm={4}>
                              <Typography variant="caption" color="textSecondary">
                                Reported By
                              </Typography>
                              <Typography variant="body2">
                                {item.reporter_name}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Typography variant="caption" color="textSecondary">
                                Created
                              </Typography>
                              <Typography variant="body2">
                                {new Date(item.created_at).toLocaleDateString()}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Typography variant="caption" color="textSecondary">
                                Category
                              </Typography>
                              <Typography variant="body2">
                                {item.category}
                              </Typography>
                            </Grid>
                          </Grid>

                          {item.recent_updates && item.recent_updates.length > 0 && (
                            <>
                              <Typography variant="subtitle2" gutterBottom>
                                Recent Updates
                              </Typography>
                              <List dense>
                                {item.recent_updates.map((update, idx) => (
                                  <React.Fragment key={idx}>
                                    <ListItem>
                                      <ListItemText
                                        primary={update.update_note}
                                        secondary={`${update.updated_by} - ${new Date(update.created_at).toLocaleString()}`}
                                      />
                                    </ListItem>
                                    {idx < item.recent_updates!.length - 1 && <Divider />}
                                  </React.Fragment>
                                ))}
                              </List>
                            </>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={actionItems.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Update Dialog */}
      <Dialog 
        open={updateDialog.open} 
        onClose={() => setUpdateDialog({ open: false, actionItemId: 0, updateNote: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Update</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Update Note"
            fullWidth
            multiline
            rows={4}
            value={updateDialog.updateNote}
            onChange={(e) => setUpdateDialog(prev => ({ ...prev, updateNote: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialog({ open: false, actionItemId: 0, updateNote: '' })}>
            Cancel
          </Button>
          <Button onClick={handleAddUpdate} variant="contained">
            Add Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActionItemsReport;