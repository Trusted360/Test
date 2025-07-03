import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  IconButton,
  useTheme,
  useMediaQuery,
  Typography,
  Box,
  LinearProgress
} from '@mui/material';
import {
  CameraAlt as CameraAltIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface MobileCameraCaptureProps {
  open: boolean;
  onCapture: (file: File) => void;
  onCancel: () => void;
  uploading?: boolean;
}

const MobileCameraCapture: React.FC<MobileCameraCaptureProps> = ({
  open,
  onCapture,
  onCancel,
  uploading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleConfirmCapture = () => {
    if (selectedFile) {
      onCapture(selectedFile);
      setSelectedFile(null);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    onCancel();
  };

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel} 
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {isMobile ? 'Take Photo' : 'Camera Capture'}
          <IconButton edge="end" color="inherit" onClick={handleCancel}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {uploading && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Uploading photo...
            </Typography>
            <LinearProgress />
          </Box>
        )}
        
        <Stack spacing={2}>
          {selectedFile ? (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Photo Selected: {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
              
              {selectedFile.type.startsWith('image/') && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 300,
                      objectFit: 'contain',
                      borderRadius: 8
                    }}
                  />
                </Box>
              )}
            </Box>
          ) : (
            <>
              <Typography variant="body1" gutterBottom>
                Choose how to add your photo:
              </Typography>
              
              {isMobileDevice() && (
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<CameraAltIcon />}
                  fullWidth
                  size="large"
                  sx={{ py: 2 }}
                >
                  Take Photo with Camera
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    capture="environment" // Use rear camera on mobile
                    onChange={handleFileSelect}
                  />
                </Button>
              )}
              
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoLibraryIcon />}
                fullWidth
                size="large"
                sx={{ py: 2 }}
              >
                Choose from Gallery
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </Button>
              
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Supported formats: JPG, PNG, GIF (max 10MB)
              </Typography>
            </>
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleCancel} color="inherit">
          Cancel
        </Button>
        {selectedFile && (
          <Button
            onClick={handleConfirmCapture}
            variant="contained"
            disabled={uploading}
          >
            Upload Photo
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MobileCameraCapture;