import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  LinearProgress,
  Collapse,
  Avatar,
  Stack,
  Divider
} from '@mui/material';
import {
  Assessment as ReportsIcon,
  Timeline as MetricsIcon,
  History as ActivityIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as PendingIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FilterList as FilterIcon,
  Assignment as AssignmentIcon,
  AttachFile as AttachmentIcon,
  Comment as CommentIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import auditService, {
  AuditLog,
  AuditStatistics,
  PropertyMetrics,
  AuditFilters
} from '../../services/audit.service';
import propertyAuditService, {
  PropertyAuditData,
  PropertyChecklist,
  ChecklistItem,
  PropertyAuditFilters
} from '../../services/propertyAudit.service';

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
      id={`audit-tabpanel-${index}`}
      aria-labelledby={`audit-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AuditDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [propertyMetrics, setPropertyMetrics] = useState<PropertyMetrics[]>([]);
  
  // Property audit data
  const [propertyAuditData, setPropertyAuditData] = useState<PropertyAuditData | null>(null);
  const [expandedChecklists, setExpandedChecklists] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [propertyFilters, setPropertyFilters] = useState<PropertyAuditFilters>({});
  
  // Filter states
  const [filters, setFilters] = useState<AuditFilters>({
    page: 1,
    limit: 20
  });
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (tabValue === 1) {
      loadAuditLogs();
    } else if (tabValue === 3) {
      loadPropertyAuditData();
    }
  }, [tabValue, filters, propertyFilters]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, activityData, metricsData] = await Promise.all([
        auditService.getStatistics(),
        auditService.getRecentActivity(10),
        auditService.getPropertyMetrics()
      ]);

      setStatistics(statsData);
      setRecentActivity(activityData);
      setPropertyMetrics(metricsData);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const loadPropertyAuditData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await propertyAuditService.getPropertyAuditData(propertyFilters);
      setPropertyAuditData(data);
    } catch (err: any) {
      console.error('Failed to load property audit data:', err);
      setError(err.message || 'Failed to load property audit data');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await auditService.getAuditLogs(filters);
      setAuditLogs(response.logs);
      setTotalLogs(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to load audit logs');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFilterChange = (field: keyof AuditFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: field !== 'page' ? 1 : value // Reset to page 1 when changing filters
    }));
  };
  
  const handlePropertyFilterChange = (field: keyof PropertyAuditFilters, value: any) => {
    setPropertyFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const toggleChecklistExpanded = (checklistId: number) => {
    setExpandedChecklists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(checklistId)) {
        newSet.delete(checklistId);
      } else {
        newSet.add(checklistId);
      }
      return newSet;
    });
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'in_progress':
        return <CircularProgress size={16} />;
      case 'pending':
        return <PendingIcon color="warning" fontSize="small" />;
      default:
        return <PendingIcon fontSize="small" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return format(date, 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Date formatting error:', error, 'for dateString:', dateString);
      return 'Invalid Date';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' } = {
      'auth': 'primary',
      'checklist': 'success',
      'video': 'info',
      'property': 'secondary',
      'maintenance': 'warning',
      'system': 'error',
      'user': 'primary'
    };
    return colors[category] || 'default';
  };

  if (loading && !statistics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" gutterBottom>
            Audit & Reporting Dashboard
          </Typography>
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadDashboardData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<MetricsIcon />} label="Overview" />
            <Tab icon={<ActivityIcon />} label="Activity Logs" />
            <Tab icon={<ReportsIcon />} label="Reports" />
            <Tab icon={<AssignmentIcon />} label="Property Checklists" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Statistics Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Events
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.totalEvents?.toLocaleString() || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Today's Events
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.todayEvents?.toLocaleString() || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    This Week
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.weekEvents?.toLocaleString() || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    This Month
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.monthEvents?.toLocaleString() || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Recent Activity */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>User</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentActivity.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {formatDate(log.created_at)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.category}
                              size="small"
                              color={getCategoryColor(log.category)}
                            />
                          </TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>
                            {log.first_name && log.last_name 
                              ? `${log.first_name} ${log.last_name}` 
                              : log.email || 'System'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Property Metrics */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Property Metrics (Today)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Property</TableCell>
                        <TableCell>Tasks</TableCell>
                        <TableCell>Checklists</TableCell>
                        <TableCell>Alerts</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {propertyMetrics.slice(0, 5).map((metric) => (
                        <TableRow key={metric.property_id}>
                          <TableCell>{metric.property_name}</TableCell>
                          <TableCell>{metric.tasks_completed}</TableCell>
                          <TableCell>{metric.checklists_completed}</TableCell>
                          <TableCell>{metric.alerts_triggered}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Activity Logs Tab */}
        <TabPanel value={tabValue} index={1}>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="Start Date"
                  value={filters.startDate ? new Date(filters.startDate) : null}
                  onChange={(date) => handleFilterChange('startDate', date?.toISOString().split('T')[0])}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="End Date"
                  value={filters.endDate ? new Date(filters.endDate) : null}
                  onChange={(date) => handleFilterChange('endDate', date?.toISOString().split('T')[0])}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  label="Category"
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">All Categories</MenuItem>
                  <MenuItem value="auth">Authentication</MenuItem>
                  <MenuItem value="checklist">Checklists</MenuItem>
                  <MenuItem value="video">Video Analysis</MenuItem>
                  <MenuItem value="property">Properties</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Entity Type"
                  value={filters.entityType || ''}
                  onChange={(e) => handleFilterChange('entityType', e.target.value || undefined)}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  onClick={() => setFilters({ page: 1, limit: 20 })}
                  fullWidth
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Audit Logs Table */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>IP Address</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.created_at)}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.category}
                          size="small"
                          color={getCategoryColor(log.category)}
                        />
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>
                        {log.first_name && log.last_name 
                          ? `${log.first_name} ${log.last_name}` 
                          : log.email || 'System'}
                      </TableCell>
                      <TableCell>
                        {log.entity_type && log.entity_id && (
                          <Typography variant="body2">
                            {log.entity_type}#{log.entity_id}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {log.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {log.ip_address}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
              <Typography variant="body2" color="textSecondary">
                Showing {((filters.page || 1) - 1) * (filters.limit || 20) + 1} to{' '}
                {Math.min((filters.page || 1) * (filters.limit || 20), totalLogs)} of {totalLogs} entries
              </Typography>
              <Box>
                <Button
                  disabled={(filters.page || 1) <= 1}
                  onClick={() => handleFilterChange('page', (filters.page || 1) - 1)}
                >
                  Previous
                </Button>
                <Button
                  disabled={(filters.page || 1) >= totalPages}
                  onClick={() => handleFilterChange('page', (filters.page || 1) + 1)}
                  sx={{ ml: 1 }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          </Paper>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Available Report Templates
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Generate comprehensive reports for compliance, performance analysis, and operational insights.
              </Typography>
            </Grid>
            
            {/* Report Templates Grid */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Daily Operations Dashboard
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Start-of-day overview for property managers with actionable items
                  </Typography>
                  <Chip label="Activity Report" size="small" color="info" sx={{ mr: 1 }} />
                  <Button variant="outlined" size="small" sx={{ mt: 2 }} fullWidth>
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Property Health Check
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Quick overview of each property's operational status
                  </Typography>
                  <Chip label="Compliance Report" size="small" color="success" sx={{ mr: 1 }} />
                  <Button variant="outlined" size="small" sx={{ mt: 2 }} fullWidth>
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Team Performance Summary
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Track staff productivity and task completion rates
                  </Typography>
                  <Chip label="Performance Report" size="small" color="warning" sx={{ mr: 1 }} />
                  <Button variant="outlined" size="small" sx={{ mt: 2 }} fullWidth>
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Security Alert Analysis
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Analyze video alerts patterns and false positive rates
                  </Typography>
                  <Chip label="Security Report" size="small" color="error" sx={{ mr: 1 }} />
                  <Button variant="outlined" size="small" sx={{ mt: 2 }} fullWidth>
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                <Typography variant="body2">
                  <strong>Note:</strong> Report generation functionality is available through the API. 
                  The frontend interface for custom report generation will be added in the next update.
                  You can currently access all audit data through the Activity Logs tab.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Property Checklists Tab */}
        <TabPanel value={tabValue} index={3}>
          {/* Filter Section */}
          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Property Checklist Audits</Typography>
              <Tooltip title="Toggle Filters">
                <IconButton onClick={() => setShowFilters(!showFilters)} color="primary">
                  <FilterIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Collapse in={showFilters}>
              <Paper sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={2}>
                    <DatePicker
                      label="Start Date"
                      value={propertyFilters.startDate ? new Date(propertyFilters.startDate) : null}
                      onChange={(date) => handlePropertyFilterChange('startDate', date?.toISOString().split('T')[0])}
                      slotProps={{
                        textField: {
                          size: 'small',
                          fullWidth: true
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <DatePicker
                      label="End Date"
                      value={propertyFilters.endDate ? new Date(propertyFilters.endDate) : null}
                      onChange={(date) => handlePropertyFilterChange('endDate', date?.toISOString().split('T')[0])}
                      slotProps={{
                        textField: {
                          size: 'small',
                          fullWidth: true
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      select
                      label="Status"
                      value={propertyFilters.status || ''}
                      onChange={(e) => handlePropertyFilterChange('status', e.target.value || undefined)}
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button
                      variant="outlined"
                      onClick={() => setPropertyFilters({})}
                      fullWidth
                    >
                      Clear Filters
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Collapse>
          </Box>

          {/* Summary Cards */}
          {propertyAuditData && (
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Checklists
                    </Typography>
                    <Typography variant="h4">
                      {propertyAuditData.summary.total_checklists}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Properties
                    </Typography>
                    <Typography variant="h4">
                      {propertyAuditData.summary.total_properties}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Completed
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {propertyAuditData.summary.completed_checklists}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      In Progress
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      {propertyAuditData.summary.in_progress_checklists}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Pending
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {propertyAuditData.summary.pending_checklists}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Overdue
                    </Typography>
                    <Typography variant="h4" color="error.main">
                      {propertyAuditData.summary.overdue_checklists}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Checklist Details */}
          {propertyAuditData?.checklists.map((checklist) => (
            <Paper key={checklist.checklist_id} sx={{ mb: 2 }}>
              {/* Checklist Header */}
              <Box
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
                onClick={() => toggleChecklistExpanded(checklist.checklist_id)}
              >
                <Grid container alignItems="center" spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconButton size="small">
                        {expandedChecklists.has(checklist.checklist_id) ? 
                          <ExpandLessIcon /> : <ExpandMoreIcon />
                        }
                      </IconButton>
                      {getStatusIcon(checklist.status)}
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {checklist.template_name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {checklist.property_name}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Progress
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={checklist.completion_percentage}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="body2">
                          {checklist.completion_percentage}%
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Assigned To
                      </Typography>
                      <Typography variant="body2">
                        {checklist.assigned_to_name || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Due Date
                      </Typography>
                      <Typography 
                        variant="body2"
                        color={propertyAuditService.isOverdue(checklist.due_date, checklist.status) ? 'error' : 'inherit'}
                      >
                        {formatDate(checklist.due_date)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={checklist.status}
                        size="small"
                        color={propertyAuditService.getStatusColor(checklist.status)}
                      />
                      {checklist.items_with_issues > 0 && (
                        <Chip
                          icon={<WarningIcon />}
                          label={`${checklist.items_with_issues} issues`}
                          size="small"
                          color="warning"
                        />
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </Box>

              {/* Checklist Item Details */}
              <Collapse in={expandedChecklists.has(checklist.checklist_id)}>
                <Divider />
                <Box sx={{ p: 2 }}>
                  {/* Metadata */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="textSecondary">
                        Created
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(checklist.created_at)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="textSecondary">
                        Completed
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(checklist.completed_at)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="textSecondary">
                        Items
                      </Typography>
                      <Typography variant="body2">
                        {checklist.completed_items} / {checklist.total_items} completed
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="textSecondary">
                        Attachments
                      </Typography>
                      <Typography variant="body2">
                        {checklist.attachment_count} files
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* Checklist Items Table */}
                  {checklist.items.length > 0 && (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Item</TableCell>
                            <TableCell>Response</TableCell>
                            <TableCell>Completed By</TableCell>
                            <TableCell>Completed At</TableCell>
                            <TableCell>Issues</TableCell>
                            <TableCell align="center">Details</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {checklist.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  {item.item_completed_at ? (
                                    <CheckCircleIcon color="success" fontSize="small" />
                                  ) : (
                                    <PendingIcon color="disabled" fontSize="small" />
                                  )}
                                  <Typography variant="body2">
                                    {item.item_text}
                                    {item.is_required && (
                                      <Chip label="Required" size="small" sx={{ ml: 1 }} />
                                    )}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.response_value || '-'}
                                </Typography>
                                {item.notes && (
                                  <Typography variant="caption" color="textSecondary">
                                    Note: {item.notes}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.completed_by_name || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {formatDate(item.item_completed_at)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {item.issue_severity && item.issue_severity !== 'none' && (
                                  <Box>
                                    <Chip
                                      label={item.issue_severity}
                                      size="small"
                                      color={propertyAuditService.getSeverityColor(item.issue_severity)}
                                    />
                                    {item.issue_description && (
                                      <Typography variant="caption" display="block">
                                        {item.issue_description}
                                      </Typography>
                                    )}
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Stack direction="row" spacing={1} justifyContent="center">
                                  {item.attachments > 0 && (
                                    <Chip
                                      icon={<AttachmentIcon />}
                                      label={item.attachments}
                                      size="small"
                                    />
                                  )}
                                  {item.comments > 0 && (
                                    <Chip
                                      icon={<CommentIcon />}
                                      label={item.comments}
                                      size="small"
                                    />
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {/* Action Buttons */}
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/checklists/${checklist.checklist_id}`)}
                    >
                      View Full Details
                    </Button>
                    {checklist.status === 'completed' && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                      >
                        Generate Report
                      </Button>
                    )}
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          ))}

          {/* Checklist Activity Timeline */}
          {propertyAuditData && propertyAuditData.auditActivity.length > 0 && (
            <Box mt={4}>
              <Typography variant="h6" gutterBottom>
                Recent Checklist Activity
              </Typography>
              <Paper>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {propertyAuditData.auditActivity.slice(0, 10).map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>
                            {formatDate(activity.created_at)}
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar sx={{ width: 24, height: 24 }}>
                                {activity.user_name?.charAt(0) || 'U'}
                              </Avatar>
                              <Typography variant="body2">
                                {activity.user_name || activity.user_email}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={activity.action}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {activity.description}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}
        </TabPanel>
      </Box>
    </LocalizationProvider>
  );
};

export default AuditDashboard;
