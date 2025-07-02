import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent,
  Alert,
  AlertTitle,
  Chip,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Build as BuildIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import propertyManagerService, { 
  PropertyIssue, 
  RecentInspection, 
  PropertyMetric 
} from '../../services/propertyManager.service';

const PropertyManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState<{
    propertyIssues: PropertyIssue[];
    recentInspections: RecentInspection[];
    todayMetrics: PropertyMetric[];
    attentionRequired: any[];
  }>({
    propertyIssues: [],
    recentInspections: [],
    todayMetrics: [],
    attentionRequired: []
  });

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await propertyManagerService.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'major': return 'warning';
      case 'moderate': return 'info';
      case 'minor': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon color="success" />;
      case 'open': return <ErrorIcon color="error" />;
      case 'in_progress': return <BuildIcon color="info" />;
      default: return <AssignmentIcon />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Property Manager Dashboard</Typography>
        <IconButton onClick={loadDashboard} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Attention Required Section */}
      {dashboardData.attentionRequired.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {dashboardData.attentionRequired.map((property) => (
            <Alert 
              key={property.id} 
              severity="warning" 
              sx={{ mb: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small"
                  onClick={() => navigate(`/property-manager/properties/${property.id}`)}
                >
                  View Details
                </Button>
              }
            >
              <AlertTitle>{property.name} Requires Attention</AlertTitle>
              {property.open_action_items} open items, {property.overdue_action_items} overdue
              {property.attention_reasons && (
                <Box sx={{ mt: 1 }}>
                  {JSON.parse(property.attention_reasons).map((reason: string, idx: number) => (
                    <Chip 
                      key={idx} 
                      label={reason} 
                      size="small" 
                      sx={{ mr: 1 }} 
                    />
                  ))}
                </Box>
              )}
            </Alert>
          ))}
        </Box>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Open Issues
              </Typography>
              <Typography variant="h4">
                {dashboardData.propertyIssues.reduce((sum, p) => sum + parseInt(p.open_issues), 0)}
              </Typography>
              <Typography variant="body2" color="error">
                {dashboardData.propertyIssues.reduce((sum, p) => sum + parseInt(p.overdue_issues), 0)} overdue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Critical Issues
              </Typography>
              <Typography variant="h4" color="error">
                {dashboardData.propertyIssues.reduce((sum, p) => sum + parseInt(p.critical_issues), 0)}
              </Typography>
              <Typography variant="body2">
                Requires immediate attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Inspections Today
              </Typography>
              <Typography variant="h4">
                {dashboardData.todayMetrics.reduce((sum, m) => sum + m.inspections_completed, 0)}
              </Typography>
              <Typography variant="body2" color="success.main">
                All on schedule
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Estimated Costs
              </Typography>
              <Typography variant="h4">
                ${dashboardData.propertyIssues.reduce((sum, p) => sum + (parseFloat(p.estimated_cost) || 0), 0).toFixed(0)}
              </Typography>
              <Typography variant="body2">
                Pending repairs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Property Issues" />
          <Tab label="Recent Inspections" />
          <Tab label="Quick Actions" />
        </Tabs>
      </Paper>

      {/* Property Issues Tab */}
      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Property</TableCell>
                <TableCell align="center">Open</TableCell>
                <TableCell align="center">In Progress</TableCell>
                <TableCell align="center">Overdue</TableCell>
                <TableCell align="center">Critical</TableCell>
                <TableCell align="center">Major</TableCell>
                <TableCell align="right">Est. Cost</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.propertyIssues.map((property) => (
                <TableRow key={property.property_id}>
                  <TableCell>{property.property_name}</TableCell>
                  <TableCell align="center">
                    <Chip label={property.open_issues} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={property.in_progress_issues} size="small" color="info" />
                  </TableCell>
                  <TableCell align="center">
                    {property.overdue_issues > 0 ? (
                      <Chip label={property.overdue_issues} size="small" color="error" />
                    ) : (
                      <Chip label="0" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {property.critical_issues > 0 ? (
                      <Chip label={property.critical_issues} size="small" color="error" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {property.major_issues > 0 ? (
                      <Chip label={property.major_issues} size="small" color="warning" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    ${(parseFloat(property.estimated_cost) || 0).toFixed(0)}
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      onClick={() => navigate(`/property-manager/reports/action-items?propertyId=${property.property_id}`)}
                    >
                      View Issues
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Recent Inspections Tab */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Property</TableCell>
                <TableCell>Checklist</TableCell>
                <TableCell>Inspector</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell align="center">Issues Found</TableCell>
                <TableCell align="center">Serious Issues</TableCell>
                <TableCell align="center">Photos</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.recentInspections.map((inspection) => (
                <TableRow key={inspection.checklist_id}>
                  <TableCell>{inspection.property_name}</TableCell>
                  <TableCell>{inspection.checklist_name}</TableCell>
                  <TableCell>{inspection.inspector_name}</TableCell>
                  <TableCell>
                    {new Date(inspection.completed_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    {inspection.issues_found > 0 ? (
                      <Chip 
                        label={inspection.issues_found} 
                        size="small" 
                        color={inspection.serious_issues > 0 ? 'error' : 'warning'} 
                      />
                    ) : (
                      <Chip label="None" size="small" color="success" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {inspection.serious_issues > 0 ? (
                      <Chip label={inspection.serious_issues} size="small" color="error" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {inspection.photos_attached || '-'}
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      onClick={() => navigate(`/checklists/${inspection.checklist_id}`)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Quick Actions Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/property-manager/reports/action-items')}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssignmentIcon sx={{ mr: 2, fontSize: 40 }} color="primary" />
                  <Typography variant="h6">Action Items Report</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  View and manage all open action items across properties
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/property-manager/reports/staff-performance')}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon sx={{ mr: 2, fontSize: 40 }} color="primary" />
                  <Typography variant="h6">Staff Performance</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Track team productivity and inspection quality
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/property-manager/reports/recurring-issues')}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WarningIcon sx={{ mr: 2, fontSize: 40 }} color="primary" />
                  <Typography variant="h6">Recurring Issues</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Identify patterns and prevent future problems
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default PropertyManagerDashboard;