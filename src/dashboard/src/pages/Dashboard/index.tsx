import React, { useState, useEffect } from 'react';
import { Typography, Box, Grid, Paper, Stack, Button, CircularProgress, Chip, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Business as BusinessIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Videocam as VideocamIcon,
  CameraAlt as CameraIcon,
  Assessment as ReportIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PropertyWithStats, propertyService } from '../../services/property.service';
import { checklistService } from '../../services/checklist.service';
import { videoService, Alert as VideoAlert } from '../../services/video.service';
import { Checklist } from '../../types/checklist.types';
import VideoAlertIcon from '../../components/VideoAlertIcon';
import MobileCard from '../../components/MobileCard';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [properties, setProperties] = useState<PropertyWithStats[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [recentChecklists, setRecentChecklists] = useState<Checklist[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState(true);
  const [videoEvents, setVideoEvents] = useState<VideoAlert[]>([]);
  const [videoEventsLoading, setVideoEventsLoading] = useState(true);

  useEffect(() => {
    loadProperties();
    loadRecentChecklists();
    loadVideoEvents();
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



  const loadVideoEvents = async () => {
    try {
      setVideoEventsLoading(true);
      const response = await videoService.getAlerts({ 
        limit: 10 
      });
      setVideoEvents(response.data);
    } catch (error) {
      console.error('Error loading video events:', error);
    } finally {
      setVideoEventsLoading(false);
    }
  };

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'success' => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  const getChecklistDisplayName = (checklist: Checklist): string => {
    if (checklist.template?.name) {
      return checklist.template.name;
    }
    if (checklist.template_name) {
      return checklist.template_name;
    }
    // Generate a meaningful name based on available data
    const propertyName = checklist.property?.name || checklist.property_name || 'Unknown Property';
    const createdDate = new Date(checklist.created_at).toLocaleDateString();
    return `Checklist for ${propertyName} (${createdDate})`;
  };


  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={isMobile ? 3 : 4}>
        <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.name || 'Guest'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Your security audit platform overview
          </Typography>
        </Box>

        {/* Mobile-optimized single column layout */}
        <Stack spacing={isMobile ? 2.5 : 3}>
          {/* Properties Overview - Mobile Card Format */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <BusinessIcon />
                Properties Overview
              </Typography>
              <Button
                variant="outlined"
                size={isMobile ? "medium" : "small"}
                onClick={() => navigate('/properties')}
                sx={{ minHeight: isMobile ? '44px' : 'auto' }}
              >
                View All
              </Button>
            </Box>
            
            {propertiesLoading ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={isMobile ? 32 : 24} />
              </Box>
            ) : properties.length > 0 ? (
              <Stack spacing={isMobile ? 2 : 1.5}>
                {properties.map((property) => (
                  <MobileCard
                    key={property.id}
                    title={property.name}
                    subtitle={property.address}
                    status={{
                      label: propertyService.formatPropertyStatus(property.status),
                      color: propertyService.getStatusColor(property.status)
                    }}
                    metadata={[
                      {
                        label: "Cameras",
                        value: property.camera_count || 0,
                        icon: <CameraIcon />
                      },
                      ...(property.checklist_count ? [{
                        label: "Checklists",
                        value: property.checklist_count,
                        icon: <AssignmentIcon />
                      }] : [])
                    ]}
                    onClick={() => navigate(`/properties/${property.id}`)}
                    showChevron={true}
                  />
                ))}
              </Stack>
            ) : (
              <MobileCard
                title="No Properties Yet"
                description="Get started by adding your first property to monitor."
                actions={[{
                  label: "Add Property",
                  onClick: () => navigate('/properties'),
                  icon: <AddIcon />,
                  color: 'primary',
                  variant: 'contained'
                }]}
              />
            )}
          </Box>

          {/* Recent Checklists - Mobile Format */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <AssignmentIcon />
                Recent Checklists
              </Typography>
              <Button
                variant="outlined"
                size={isMobile ? "medium" : "small"}
                onClick={() => navigate('/checklists')}
                sx={{ minHeight: isMobile ? '44px' : 'auto' }}
              >
                View All
              </Button>
            </Box>
            
            {checklistsLoading ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={isMobile ? 32 : 24} />
              </Box>
            ) : recentChecklists.length > 0 ? (
              <Stack spacing={isMobile ? 2 : 1.5}>
                {recentChecklists.map((checklist) => (
                  <MobileCard
                    key={checklist.id}
                    title={getChecklistDisplayName(checklist)}
                    subtitle={`${checklist.property?.name || checklist.property_name || 'No Property'} • ${new Date(checklist.created_at).toLocaleDateString()}`}
                    status={{
                      label: checklistService.formatStatus(checklist.status),
                      color: checklistService.getStatusColor(checklist.status)
                    }}
                    onClick={() => navigate(`/checklists/${checklist.id}`)}
                    showChevron={true}
                  />
                ))}
              </Stack>
            ) : (
              <MobileCard
                title="No Checklists Yet"
                description="Create your first checklist to start auditing properties."
                actions={[{
                  label: "Create Checklist",
                  onClick: () => navigate('/checklists'),
                  icon: <AddIcon />,
                  color: 'primary',
                  variant: 'contained'
                }]}
              />
            )}
          </Box>

          {/* Video Analysis Events - Mobile Format */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <VideocamIcon />
                Video Analysis Events
              </Typography>
              <Button
                variant="outlined"
                size={isMobile ? "medium" : "small"}
                onClick={() => navigate('/video')}
                sx={{ minHeight: isMobile ? '44px' : 'auto' }}
              >
                View All
              </Button>
            </Box>
            
            {videoEventsLoading ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={isMobile ? 32 : 24} />
              </Box>
            ) : videoEvents.length > 0 ? (
              <Stack spacing={isMobile ? 2 : 1.5} sx={{ maxHeight: isMobile ? 'none' : 300, overflowY: isMobile ? 'visible' : 'auto' }}>
                {videoEvents.slice(0, isMobile ? 3 : 5).map((event: any) => (
                  <MobileCard
                    key={event.id}
                    title={event.alert_type_name}
                    subtitle={`${event.camera_name} • ${event.property_name}`}
                    description={new Date(event.created_at).toLocaleString()}
                    status={{
                      label: event.severity,
                      color: getSeverityColor(event.severity)
                    }}
                    metadata={[{
                      label: "Status",
                      value: event.status,
                      color: event.status === 'resolved' ? 'success' : 'default'
                    }]}
                    onClick={() => navigate(`/video/alerts/${event.id}`)}
                    showChevron={true}
                    icon={<VideoAlertIcon
                      eventType={event.alert_type_id?.toString() || event.alert_type_name.toLowerCase().replace(/\s+/g, '_')}
                      size={isMobile ? 40 : 32}
                    />}
                  />
                ))}
              </Stack>
            ) : (
              <MobileCard
                title="No Video Events"
                description="Video analysis events will appear here as they are detected by your cameras."
                icon={<VideocamIcon />}
              />
            )}
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
};

export default Dashboard;
