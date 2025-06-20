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
  Tooltip
} from '@mui/material';
import {
  Assessment as ReportsIcon,
  Timeline as MetricsIcon,
  History as ActivityIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';

import auditService, {
  AuditLog,
  AuditStatistics,
  PropertyMetrics,
  AuditFilters
} from '../../services/audit.service';

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
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [propertyMetrics, setPropertyMetrics] = useState<PropertyMetrics[]>([]);
  
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
    }
  }, [tabValue, filters]);

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
      </Box>
    </LocalizationProvider>
  );
};

export default AuditDashboard;
