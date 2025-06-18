import React, { useState, useEffect } from 'react';
import { Typography, Box, Grid, Paper, Stack, Button, CircularProgress, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Business as BusinessIcon, Add as AddIcon, Assignment as AssignmentIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PropertyWithStats, propertyService } from '../../services/property.service';
import { checklistService } from '../../services/checklist.service';
import { Checklist } from '../../types/checklist.types';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PropertyWithStats[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [recentChecklists, setRecentChecklists] = useState<Checklist[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState(true);

  useEffect(() => {
    loadProperties();
    loadRecentChecklists();
  }, []);

  const loadProperties = async () => {
    try {
      setPropertiesLoading(true);
      const response = await propertyService.getPropertiesWithSummary();
      setProperties(response.data.slice(0, 3)); // Show only first 3 for dashboard
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const loadRecentChecklists = async () => {
    try {
      setChecklistsLoading(true);
      const response = await checklistService.getChecklists();
      // Get the 5 most recent checklists
      setRecentChecklists(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading checklists:', error);
    } finally {
      setChecklistsLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.name || 'Guest'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Your security audit platform overview
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Properties Overview */}
          <Grid item xs={12}>
            <StyledPaper elevation={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                  <BusinessIcon />
                  Properties Overview
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/properties')}
                >
                  View All Properties
                </Button>
              </Box>
              
              {propertiesLoading ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : properties.length > 0 ? (
                <Grid container spacing={2}>
                  {properties.map((property) => (
                    <Grid item xs={12} md={4} key={property.id}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                          {property.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {property.address}
                        </Typography>
                        <Stack direction="row" spacing={1} mt={1}>
                          <Chip
                            label={propertyService.formatPropertyStatus(property.status)}
                            color={propertyService.getStatusColor(property.status)}
                            size="small"
                          />
                          <Chip
                            label={`${property.camera_count || 0} cameras`}
                            variant="outlined"
                            size="small"
                          />
                          {property.checklist_count && property.checklist_count > 0 && (
                            <Chip
                              label={`${property.checklist_count} checklists`}
                              variant="outlined"
                              size="small"
                            />
                          )}
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box textAlign="center" py={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    No properties configured yet.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/properties')}
                    size="small"
                  >
                    Add Your First Property
                  </Button>
                </Box>
              )}
            </StyledPaper>
          </Grid>

          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                  <AssignmentIcon />
                  Recent Checklists
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/checklists')}
                >
                  View All
                </Button>
              </Box>
              
              {checklistsLoading ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : recentChecklists.length > 0 ? (
                <Stack spacing={1}>
                  {recentChecklists.map((checklist) => (
                    <Paper 
                      key={checklist.id} 
                      variant="outlined" 
                      sx={{ p: 1.5, cursor: 'pointer' }}
                      onClick={() => navigate(`/checklists/${checklist.id}`)}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {checklist.template?.name || 'Untitled Checklist'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {checklist.property?.name || 'No Property'} • {new Date(checklist.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Chip
                          label={checklistService.formatStatus(checklist.status)}
                          color={checklistService.getStatusColor(checklist.status)}
                          size="small"
                        />
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box textAlign="center" py={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    No checklists created yet.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/checklists')}
                    size="small"
                  >
                    Create Your First Checklist
                  </Button>
                </Box>
              )}
            </StyledPaper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Typography variant="h6" gutterBottom>
                Active Alerts
              </Typography>
              <Typography variant="body2">
                No active alerts. All monitored systems are operating normally.
              </Typography>
            </StyledPaper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Typography variant="h6" gutterBottom>
                Video Monitoring
              </Typography>
              <Typography variant="body2">
                Monitor your camera feeds and receive real-time security alerts.
              </Typography>
            </StyledPaper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={2}>
              <Typography variant="h6" gutterBottom>
                AI Assistant
              </Typography>
              <Typography variant="body2">
                Get intelligent assistance with property management and security audits.
              </Typography>
            </StyledPaper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default Dashboard;
