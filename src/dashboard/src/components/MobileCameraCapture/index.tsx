import React, { useState, useRef, useEffect } from 'react';
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
  LinearProgress,
  Paper,
  Fab,
  Slide,
  Alert,
  CircularProgress,
  Backdrop
} from '@mui/material';
import {
  CameraAlt as CameraAltIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Close as CloseIcon,
  FlashOn as FlashOnIcon,
  FlashOff as FlashOffIcon,
  CameraFront as CameraFrontIcon,
  CameraRear as CameraRearIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  CropFree as CropIcon
} from '@mui/icons-material';

const Transition = React.forwardRef(function Transition(props: any, ref: React.Ref<unknown>) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface MobileCameraCaptureProps {
  open: boolean;
  onCapture: (file: File) => void;
  onCancel: () => void;
  uploading?: boolean;
  title?: string;
  maxFileSize?: number; // in MB
  quality?: number; // 0.1 to 1.0
}

const MobileCameraCapture: React.FC<MobileCameraCaptureProps> = ({
  open,
  onCapture,
  onCancel,
  uploading = false,
  title = 'Capture Photo',
  maxFileSize = 10,
  quality = 0.8
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashMode, setFlashMode] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && showLiveCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, showLiveCamera, facingMode]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Unable to access camera. Please check permissions.');
      setShowLiveCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });
          
          // Check file size
          if (file.size > maxFileSize * 1024 * 1024) {
            setCameraError(`File size too large. Maximum ${maxFileSize}MB allowed.`);
            setIsCapturing(false);
            return;
          }

          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
          setShowLiveCamera(false);
        }
        setIsCapturing(false);
      }, 'image/jpeg', quality);

    } catch (error) {
      console.error('Error capturing photo:', error);
      setCameraError('Failed to capture photo. Please try again.');
      setIsCapturing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        setCameraError(`File size too large. Maximum ${maxFileSize}MB allowed.`);
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setCameraError('Please select a valid image file.');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCameraError(null);
    }
    // Reset input value to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleFlash = () => {
    setFlashMode(prev => !prev);
    // Note: Flash control is limited in web browsers
    // This is more for UI feedback, actual flash control would need native app
  };

  const retakePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowLiveCamera(true);
    setCameraError(null);
  };

  const handleConfirmCapture = () => {
    if (selectedFile) {
      onCapture(selectedFile);
      handleCancel(); // Clean up after capture
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowLiveCamera(false);
    setCameraError(null);
    setIsCapturing(false);
    stopCamera();
    onCancel();
  };

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCancel}
        fullScreen={isMobile}
        maxWidth={showLiveCamera ? false : "sm"}
        fullWidth
        TransitionComponent={isMobile ? Transition : undefined}
        sx={{
          '& .MuiDialog-paper': {
            ...(isMobile && showLiveCamera && {
              margin: 0,
              width: '100%',
              height: '100%',
              maxHeight: '100%',
              backgroundColor: 'black'
            })
          }
        }}
      >
        {!showLiveCamera && (
          <DialogTitle sx={{ pb: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{title}</Typography>
              <IconButton
                edge="end"
                color="inherit"
                onClick={handleCancel}
                sx={{
                  minWidth: 44,
                  minHeight: 44
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
        )}
        
        <DialogContent sx={{
          p: showLiveCamera ? 0 : undefined,
          height: showLiveCamera ? '100%' : 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Loading States */}
          {uploading && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Uploading photo...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Error Display */}
          {cameraError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCameraError(null)}>
              {cameraError}
            </Alert>
          )}
          
          {/* Live Camera View */}
          {showLiveCamera && (
            <Box sx={{
              position: 'relative',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'black'
            }}>
              {/* Camera Header */}
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)'
              }}>
                <IconButton
                  onClick={handleCancel}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    minWidth: 48,
                    minHeight: 48,
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.5)'
                    }
                  }}
                >
                  <CloseIcon />
                </IconButton>

                <Stack direction="row" spacing={1}>
                  <IconButton
                    onClick={switchCamera}
                    sx={{
                      color: 'white',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      minWidth: 48,
                      minHeight: 48
                    }}
                  >
                    {facingMode === 'user' ? <CameraRearIcon /> : <CameraFrontIcon />}
                  </IconButton>
                  
                  <IconButton
                    onClick={toggleFlash}
                    sx={{
                      color: flashMode ? theme.palette.warning.main : 'white',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      minWidth: 48,
                      minHeight: 48
                    }}
                  >
                    {flashMode ? <FlashOnIcon /> : <FlashOffIcon />}
                  </IconButton>
                </Stack>
              </Box>

              {/* Video Stream */}
              <Box sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  playsInline
                  muted
                />
                
                {/* Camera Viewfinder Overlay */}
                <Box sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80%',
                  height: '60%',
                  border: '2px solid white',
                  borderRadius: 2,
                  opacity: 0.3,
                  pointerEvents: 'none'
                }} />
              </Box>

              {/* Camera Controls */}
              <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: 3,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)'
              }}>
                <Fab
                  onClick={capturePhoto}
                  disabled={isCapturing}
                  sx={{
                    width: 80,
                    height: 80,
                    backgroundColor: 'white',
                    color: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: theme.palette.grey[100]
                    },
                    '&:active': {
                      transform: 'scale(0.95)'
                    }
                  }}
                >
                  {isCapturing ? (
                    <CircularProgress size={32} />
                  ) : (
                    <CameraAltIcon sx={{ fontSize: 32 }} />
                  )}
                </Fab>
              </Box>
            </Box>
          )}

          {/* Photo Preview */}
          {selectedFile && previewUrl && !showLiveCamera && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" gutterBottom>
                Photo Preview
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedFile.name} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
              
              <Paper
                elevation={3}
                sx={{
                  p: 1,
                  display: 'inline-block',
                  borderRadius: 2,
                  maxWidth: '100%'
                }}
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: isMobile ? 300 : 400,
                    objectFit: 'contain',
                    borderRadius: 8,
                    display: 'block'
                  }}
                />
              </Paper>

              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={retakePhoto}
                  size="large"
                  sx={{ minHeight: 48 }}
                >
                  Retake
                </Button>
              </Stack>
            </Box>
          )}

          {/* Initial Options */}
          {!selectedFile && !showLiveCamera && (
            <Stack spacing={3}>
              <Typography variant="body1" textAlign="center">
                Choose how to add your photo:
              </Typography>
              
              {isMobileDevice() && (
                <Button
                  variant="contained"
                  startIcon={<CameraAltIcon />}
                  fullWidth
                  size="large"
                  onClick={() => setShowLiveCamera(true)}
                  sx={{
                    py: 2,
                    minHeight: 56,
                    fontSize: '1.1rem',
                    borderRadius: 3
                  }}
                >
                  Open Camera
                </Button>
              )}
              
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoLibraryIcon />}
                fullWidth
                size="large"
                sx={{
                  py: 2,
                  minHeight: 56,
                  fontSize: '1.1rem',
                  borderRadius: 3
                }}
              >
                Choose from Gallery
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </Button>
              
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Supported: JPG, PNG, GIF (max {maxFileSize}MB)
              </Typography>
            </Stack>
          )}
        </DialogContent>
        
        {!showLiveCamera && (
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button
              onClick={handleCancel}
              color="inherit"
              size="large"
              sx={{ minHeight: 48, px: 3 }}
            >
              Cancel
            </Button>
            {selectedFile && (
              <Button
                onClick={handleConfirmCapture}
                variant="contained"
                disabled={uploading}
                size="large"
                startIcon={uploading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                sx={{ minHeight: 48, px: 3 }}
              >
                {uploading ? 'Uploading...' : 'Use Photo'}
              </Button>
            )}
          </DialogActions>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </Dialog>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }}
        open={isCapturing}
      >
        <CircularProgress color="inherit" />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Capturing photo...
        </Typography>
      </Backdrop>
    </>
  );
};

export default MobileCameraCapture;