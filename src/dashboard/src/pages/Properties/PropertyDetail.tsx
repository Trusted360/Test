import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  Factory as FactoryIcon,
  Store as StoreIcon,
  Camera as CameraIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { Property, PropertyWithStats, propertyService } from '../../services/property.service';

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [property, setProperty] = useState<PropertyWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProperty(id);
    }
  }, [id]);

  const loadProperty = async (propertyId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await propertyService.getPropertyById(parseInt(propertyId));
      setProperty(response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load property details');
      console.error('Error loading property:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPropertyIcon = (type: string) => {
    switch (type) {
      case 'commercial':
        return <BusinessIcon sx={{ fontSize: 40 }} />;
      case 'residential':
        return <HomeIcon sx={{ fontSize: 40 }} />;
      case 'industrial':
        return <FactoryIcon sx={{ fontSize: 40 }} />;
      case 'retail':
        return <StoreIcon sx={{ fontSize: 40 }} />;
      default:
        return <BusinessIcon sx={{ fontSize: 40 }} />;
    }
  };

  const handleBack = () => {
    navigate('/properties');
  };

  const handleEdit = () => {
    // For now, navigate back to properties page
    // In a full implementation, this would open an edit dialog or navigate to an edit page
    navigate('/properties');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !property) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Stack spacing={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={handleBack}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant={isMobile ? "h5" : "h4"}>
              Property Details
            </Typography>
          </Box>
          <Alert severity="error">
            {error || 'Property not found'}
          </Alert>
          <Button onClick={handleBack} variant="outlined" sx={{ alignSelf: 'flex-start' }}>
            Back to Properties
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={2}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={handleBack}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
                Property Details
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                View and manage property information
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
          >
            Edit Property
          </Button>
        </Box>

        {/* Property Information */}
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Box display="flex" alignItems="flex-start" gap={3} mb={3}>
                {getPropertyIcon(property.property_type)}
                <Box flexGrow={1}>
                  <Typography variant="h5" component="h1" gutterBottom>
                    {property.name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {property.address}
                  </Typography>
                  <Stack direction="row" spacing={2} mt={2}>
                    <Chip
                      label={propertyService.formatPropertyType(property.property_type)}
                      variant="outlined"
                    />
                    <Chip
                      label={propertyService.formatPropertyStatus(property.status)}
                      color={propertyService.getStatusColor(property.status)}
                    />
                  </Stack>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Statistics Cards */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <CameraIcon color="primary" />
                  <Box>
                    <Typography variant="h4" component="div">
                      {property.camera_count || 0}
                    </Typography>
                    <Typography color="text.secondary">
                      Security Cameras
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <AssignmentIcon color="primary" />
                  <Box>
                    <Typography variant="h4" component="div">
                      {property.checklist_count || 0}
                    </Typography>
                    <Typography color="text.secondary">
                      Checklists
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <WarningIcon color={property.active_alerts ? "error" : "disabled"} />
                  <Box>
                    <Typography variant="h4" component="div">
                      {property.active_alerts || 0}
                    </Typography>
                    <Typography color="text.secondary">
                      Active Alerts
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Additional Information */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Property Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Property ID
              </Typography>
              <Typography variant="body1" gutterBottom>
                {property.id}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Created Date
              </Typography>
              <Typography variant="body1" gutterBottom>
                {property.created_at ? new Date(property.created_at).toLocaleDateString() : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Address
              </Typography>
              <Typography variant="body1">
                {property.address}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Action Buttons */}
        <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            fullWidth={isMobile}
          >
            Back to Properties
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            fullWidth={isMobile}
          >
            Edit Property
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default PropertyDetail;