import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  CircularProgress,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as HealthyIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface HealthMetrics {
  database: {
    status: 'healthy' | 'warning' | 'error';
    connectionCount: number;
    responseTime: number;
    lastChecked: Date;
  };
  api: {
    status: 'healthy' | 'warning' | 'error';
    uptime: number;
    responseTime: number;
    lastChecked: Date;
  };
  redis: {
    status: 'healthy' | 'warning' | 'error';
    memoryUsage: number;
    connectedClients: number;
    lastChecked: Date;
  };
  system: {
    environment: string;
    nodeVersion: string;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    lastChecked: Date;
  };
}

const SystemHealth: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Check if user has admin access
  const hasAdminAccess = user?.admin_level && user.admin_level !== 'none';

  if (!hasAdminAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access Denied: You do not have admin privileges to access system health.
        </Alert>
      </Box>
    );
  }

  const fetchHealthMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/admin/health');
      setMetrics(response.data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch health metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <HealthyIcon sx={{ color: 'success.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            System Health
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor database, API, and system performance metrics
          </Typography>
        </Box>
        <Tooltip title="Refresh metrics">
          <IconButton onClick={fetchHealthMetrics} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Last Refresh Info */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Last updated: {lastRefresh.toLocaleTimeString()} • Auto-refresh every 30s
        </Typography>
      </Box>

      {/* Loading State */}
      {loading && !metrics && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Health Metrics */}
      {metrics && (
        <Grid container spacing={3}>
          {/* Database Health */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getStatusIcon(metrics.database.status)}
                  <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                    Database
                  </Typography>
                  <Chip 
                    label={metrics.database.status.toUpperCase()} 
                    color={getStatusColor(metrics.database.status)}
                    size="small"
                  />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Connections
                    </Typography>
                    <Typography variant="h6">
                      {metrics.database.connectionCount}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Response Time
                    </Typography>
                    <Typography variant="h6">
                      {metrics.database.responseTime}ms
                    </Typography>
                  </Grid>
                </Grid>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Last checked: {new Date(metrics.database.lastChecked).toLocaleTimeString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* API Health */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getStatusIcon(metrics.api.status)}
                  <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                    API Server
                  </Typography>
                  <Chip 
                    label={metrics.api.status.toUpperCase()} 
                    color={getStatusColor(metrics.api.status)}
                    size="small"
                  />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Uptime
                    </Typography>
                    <Typography variant="h6">
                      {formatUptime(metrics.api.uptime)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Response Time
                    </Typography>
                    <Typography variant="h6">
                      {metrics.api.responseTime}ms
                    </Typography>
                  </Grid>
                </Grid>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Last checked: {new Date(metrics.api.lastChecked).toLocaleTimeString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Redis Health */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getStatusIcon(metrics.redis.status)}
                  <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                    Redis Cache
                  </Typography>
                  <Chip 
                    label={metrics.redis.status.toUpperCase()} 
                    color={getStatusColor(metrics.redis.status)}
                    size="small"
                  />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Memory Usage
                    </Typography>
                    <Typography variant="h6">
                      {formatBytes(metrics.redis.memoryUsage)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Connected Clients
                    </Typography>
                    <Typography variant="h6">
                      {metrics.redis.connectedClients}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Last checked: {new Date(metrics.redis.lastChecked).toLocaleTimeString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* System Info */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Information
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Environment
                    </Typography>
                    <Typography variant="body1">
                      {metrics.system.environment}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Node.js Version
                    </Typography>
                    <Typography variant="body1">
                      {metrics.system.nodeVersion}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Memory Usage ({metrics.system.memoryUsage.percentage.toFixed(1)}%)
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={metrics.system.memoryUsage.percentage}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatBytes(metrics.system.memoryUsage.used)} / {formatBytes(metrics.system.memoryUsage.total)}
                  </Typography>
                </Box>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Last checked: {new Date(metrics.system.lastChecked).toLocaleTimeString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Overall Status Summary */}
      {metrics && (
        <Box sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overall System Status
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  icon={getStatusIcon(metrics.database.status)}
                  label={`Database: ${metrics.database.status}`}
                  color={getStatusColor(metrics.database.status)}
                />
                <Chip 
                  icon={getStatusIcon(metrics.api.status)}
                  label={`API: ${metrics.api.status}`}
                  color={getStatusColor(metrics.api.status)}
                />
                <Chip 
                  icon={getStatusIcon(metrics.redis.status)}
                  label={`Redis: ${metrics.redis.status}`}
                  color={getStatusColor(metrics.redis.status)}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default SystemHealth;
