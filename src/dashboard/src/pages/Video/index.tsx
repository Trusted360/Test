import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { videoService } from '../../services/video.service';

interface Camera {
  id: number;
  name: string;
  property_name: string;
  location: string;
  status: string;
  active_alerts: number;
}

interface Alert {
  id: number;
  camera_name: string;
  property_name: string;
  alert_type_name: string;
  severity_level: string;
  status: string;
  created_at: string;
}

interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  resolved_alerts: number;
  alerts_today: number;
}

const VideoAnalysis: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [camerasResponse, alertsResponse, statsResponse] = await Promise.all([
        videoService.getCameras(),
        videoService.getAlerts(),
        videoService.getStats()
      ]);

      setCameras(camerasResponse.data);
      setAlerts(alertsResponse.data);
      setStats(statsResponse.data);
    } catch (err: any) {
      console.error('Error loading video data:', err);
      setError(err.message || 'Failed to load video analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateDemoAlert = async () => {
    try {
      await videoService.generateDemoAlert();
      await loadData(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to generate demo alert');
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      await videoService.resolveAlert(alertId, 'Resolved from dashboard');
      await loadData(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to resolve alert');
    }
  };

  const handleViewAlert = (alert: Alert) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'error';
      case 'resolved': return 'success';
      case 'acknowledged': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Video Analysis & Monitoring
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<WarningIcon />}
            onClick={handleGenerateDemoAlert}
            color="warning"
          >
            Generate Demo Alert
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <WarningIcon color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Alerts
                    </Typography>
                    <Typography variant="h5">
                      {stats.total_alerts}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <WarningIcon color="error" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Active Alerts
                    </Typography>
                    <Typography variant="h5">
                      {stats.active_alerts}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Resolved
                    </Typography>
                    <Typography variant="h5">
                      {stats.resolved_alerts}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <WarningIcon color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Today
                    </Typography>
                    <Typography variant="h5">
                      {stats.alerts_today}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* Cameras Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Camera Feeds
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Camera</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Alerts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cameras.map((camera) => (
                      <TableRow key={camera.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <VideocamIcon sx={{ mr: 1, fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {camera.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {camera.property_name}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{camera.location}</TableCell>
                        <TableCell>
                          <Chip
                            label={camera.status}
                            color={camera.status === 'active' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {camera.active_alerts > 0 ? (
                            <Chip
                              label={camera.active_alerts}
                              color="error"
                              size="small"
                            />
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              0
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Alerts Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Alerts
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Alert</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alerts.slice(0, 10).map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {alert.alert_type_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {alert.camera_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={alert.severity_level}
                            color={getSeverityColor(alert.severity_level) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={alert.status}
                            color={getStatusColor(alert.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleViewAlert(alert)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          {alert.status === 'active' && (
                            <Button
                              size="small"
                              onClick={() => handleResolveAlert(alert.id)}
                              sx={{ ml: 1 }}
                            >
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert Detail Dialog */}
      <Dialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Alert Details</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Alert Type
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedAlert.alert_type_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Severity
                  </Typography>
                  <Chip
                    label={selectedAlert.severity_level}
                    color={getSeverityColor(selectedAlert.severity_level) as any}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Camera
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedAlert.camera_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Property
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedAlert.property_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Status
                  </Typography>
                  <Chip
                    label={selectedAlert.status}
                    color={getStatusColor(selectedAlert.status) as any}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Created
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(selectedAlert.created_at).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialogOpen(false)}>
            Close
          </Button>
          {selectedAlert?.status === 'active' && (
            <Button
              variant="contained"
              onClick={() => {
                handleResolveAlert(selectedAlert.id);
                setAlertDialogOpen(false);
              }}
            >
              Resolve Alert
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoAnalysis;
