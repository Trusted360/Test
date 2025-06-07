import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert
} from '@mui/material';
import {
  Storage as DatabaseIcon,
  Code as SqlIcon,
  Assessment as HealthIcon,
  BugReport as LogsIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user has admin access
  const hasAdminAccess = user?.admin_level && user.admin_level !== 'none';
  const isReadOnly = user?.admin_level === 'read_only';

  if (!hasAdminAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access Denied: You do not have admin privileges to access this portal.
        </Alert>
      </Box>
    );
  }

  const adminTools = [
    {
      title: 'SQL Console',
      description: 'Execute SQL queries directly against the database',
      icon: <SqlIcon sx={{ fontSize: 40 }} />,
      path: '/admin/sql',
      color: '#1976d2',
      disabled: false
    },
    {
      title: 'System Health',
      description: 'Monitor database, API, and system performance',
      icon: <HealthIcon sx={{ fontSize: 40 }} />,
      path: '/admin/health',
      color: '#2e7d32',
      disabled: false
    },
    {
      title: 'Database Schema',
      description: 'Browse database tables, columns, and relationships',
      icon: <DatabaseIcon sx={{ fontSize: 40 }} />,
      path: '/admin/schema',
      color: '#ed6c02',
      disabled: true // Will implement later
    },
    {
      title: 'Log Viewer',
      description: 'View and search application logs',
      icon: <LogsIcon sx={{ fontSize: 40 }} />,
      path: '/admin/logs',
      color: '#9c27b0',
      disabled: true // Will implement later
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Portal
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="body1" color="text.secondary">
            Welcome, {user?.name || user?.email}
          </Typography>
          <Chip 
            label={user?.admin_level?.replace('_', ' ').toUpperCase()} 
            color={user?.admin_level === 'super_admin' ? 'error' : 'primary'}
            size="small"
          />
        </Box>
        {isReadOnly && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You have read-only access. Some features may be limited.
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          Access developer tools and system administration features
        </Typography>
      </Box>

      {/* Admin Tools Grid */}
      <Grid container spacing={3}>
        {adminTools.map((tool) => (
          <Grid item xs={12} sm={6} md={4} key={tool.title}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                opacity: tool.disabled ? 0.6 : 1,
                cursor: tool.disabled ? 'not-allowed' : 'pointer',
                '&:hover': {
                  boxShadow: tool.disabled ? 1 : 4,
                  transform: tool.disabled ? 'none' : 'translateY(-2px)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={() => !tool.disabled && navigate(tool.path)}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3 }}>
                <Box sx={{ color: tool.color, mb: 2 }}>
                  {tool.icon}
                </Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {tool.title}
                  {tool.disabled && (
                    <Chip 
                      label="Coming Soon" 
                      size="small" 
                      sx={{ ml: 1 }}
                      color="default"
                    />
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tool.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button 
                  size="small" 
                  variant="outlined"
                  disabled={tool.disabled}
                  sx={{ 
                    borderColor: tool.color,
                    color: tool.color,
                    '&:hover': {
                      borderColor: tool.color,
                      backgroundColor: `${tool.color}10`
                    }
                  }}
                >
                  {tool.disabled ? 'Coming Soon' : 'Open Tool'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Stats */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick System Info
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  ✓
                </Typography>
                <Typography variant="body2">
                  Database Connected
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  ✓
                </Typography>
                <Typography variant="body2">
                  API Healthy
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  2
                </Typography>
                <Typography variant="body2">
                  Demo Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  POC
                </Typography>
                <Typography variant="body2">
                  Environment
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
