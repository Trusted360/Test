import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Alert,
  Backdrop,
  CircularProgress,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Fullscreen,
  FullscreenExit,
  Close,
  CheckCircle,
  Warning,
  Error,
  Info,
  Share,
  Download,
  Flag
} from '@mui/icons-material';

interface VideoAlert {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  location?: string;
  cameraId?: string;
  duration?: number;
  status: 'new' | 'viewed' | 'acknowledged' | 'resolved';
}

interface MobileVideoAlertProps {
  alert: VideoAlert;
  open: boolean;
  onClose: () => void;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
  onShare: (alertId: string) => void;
  onDownload: (alertId: string) => void;
  onFlag: (alertId: string) => void;
}

const MobileVideoAlert: React.FC<MobileVideoAlertProps> = ({
  alert,
  open,
  onClose,
  onAcknowledge,
  onResolve,
  onShare,
  onDownload,
  onFlag
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.load();
    }
  }, [open]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreenToggle = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        if (videoRef.current.requestFullscreen) {
          videoRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleVideoLoaded = () => {
    setLoading(false);
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoError = () => {
    setLoading(false);
    setError('Failed to load video');
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <Error />;
      case 'high': return <Warning />;
      case 'medium': return <Info />;
      case 'low': return <CheckCircle />;
      default: return <Info />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!open) return null;

  return (
    <Backdrop
      open={open}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      sx={{
        zIndex: theme.zIndex.modal,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: isMobile ? 1 : 2
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 600,
          maxHeight: '100%',
          overflow: 'auto',
          margin: 'auto',
          backgroundColor: theme.palette.background.paper
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Chip
              icon={getPriorityIcon(alert.priority)}
              label={alert.priority.toUpperCase()}
              color={getPriorityColor(alert.priority) as any}
              size="small"
            />
            <Typography variant="h6" noWrap sx={{ flex: 1 }}>
              {alert.title}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="large"
            sx={{
              minWidth: 44,
              minHeight: 44,
              color: theme.palette.text.secondary
            }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Video Player */}
        <Box
          sx={{
            position: 'relative',
            backgroundColor: '#000',
            aspectRatio: '16/9'
          }}
        >
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.5)'
              }}
            >
              <CircularProgress color="primary" />
            </Box>
          )}

          {error ? (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <Alert severity="error" sx={{ backgroundColor: 'transparent' }}>
                {error}
              </Alert>
            </Box>
          ) : (
            <video
              ref={videoRef}
              src={alert.videoUrl}
              poster={alert.thumbnailUrl}
              onLoadedMetadata={handleVideoLoaded}
              onError={handleVideoError}
              onTimeUpdate={handleTimeUpdate}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          )}

          {/* Video Controls */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <IconButton
              onClick={handlePlayPause}
              disabled={loading || !!error}
              sx={{
                minWidth: 48,
                minHeight: 48,
                color: 'white',
                backgroundColor: 'rgba(255,255,255,0.2)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.3)'
                }
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>

            <Box sx={{ flex: 1, color: 'white', fontSize: '0.875rem' }}>
              {duration > 0 && (
                <>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </>
              )}
            </Box>

            <IconButton
              onClick={handleMuteToggle}
              disabled={loading || !!error}
              sx={{
                minWidth: 44,
                minHeight: 44,
                color: 'white'
              }}
            >
              {isMuted ? <VolumeOff /> : <VolumeUp />}
            </IconButton>

            <IconButton
              onClick={handleFullscreenToggle}
              disabled={loading || !!error}
              sx={{
                minWidth: 44,
                minHeight: 44,
                color: 'white'
              }}
            >
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Box>
        </Box>

        {/* Alert Details */}
        <CardContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {alert.description}
          </Typography>

          <Stack spacing={1} sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Time:</strong> {formatTimestamp(alert.timestamp)}
            </Typography>
            {alert.location && (
              <Typography variant="body2" color="text.secondary">
                <strong>Location:</strong> {alert.location}
              </Typography>
            )}
            {alert.cameraId && (
              <Typography variant="body2" color="text.secondary">
                <strong>Camera:</strong> {alert.cameraId}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              <strong>Status:</strong> {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
            </Typography>
          </Stack>

          {/* Action Buttons */}
          <Stack spacing={2}>
            {alert.status === 'new' && (
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<CheckCircle />}
                onClick={() => onAcknowledge(alert.id)}
                sx={{
                  minHeight: 56,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                Acknowledge Alert
              </Button>
            )}

            {(alert.status === 'viewed' || alert.status === 'acknowledged') && (
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<CheckCircle />}
                onClick={() => onResolve(alert.id)}
                sx={{
                  minHeight: 56,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                Mark as Resolved
              </Button>
            )}

            {/* Secondary Actions */}
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Share />}
                onClick={() => onShare(alert.id)}
                sx={{
                  flex: 1,
                  minHeight: 44,
                  fontSize: '0.9rem'
                }}
              >
                Share
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => onDownload(alert.id)}
                sx={{
                  flex: 1,
                  minHeight: 44,
                  fontSize: '0.9rem'
                }}
              >
                Download
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<Flag />}
                onClick={() => onFlag(alert.id)}
                sx={{
                  flex: 1,
                  minHeight: 44,
                  fontSize: '0.9rem'
                }}
              >
                Flag
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Backdrop>
  );
};

export default MobileVideoAlert;