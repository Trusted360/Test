import React from 'react';
import {
  Box,
  Skeleton,
  Stack,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Backdrop,
  Fade,
  Grow
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Mobile Card Skeleton
export const MobileCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) return null;

  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" alignItems="flex-start" gap={2}>
              {/* Checkbox skeleton */}
              <Skeleton 
                variant="rectangular" 
                width={48} 
                height={48} 
                sx={{ borderRadius: 2, flexShrink: 0 }} 
                animation="wave"
              />
              
              {/* Content skeleton */}
              <Box flex={1} minWidth={0}>
                <Skeleton variant="text" width="80%" height={24} animation="wave" />
                <Skeleton variant="text" width="60%" height={20} sx={{ mt: 0.5 }} animation="wave" />
                <Box display="flex" gap={1} mt={1}>
                  <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} animation="wave" />
                  <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} animation="wave" />
                </Box>
              </Box>

              {/* Expand button skeleton */}
              <Skeleton 
                variant="circular" 
                width={40} 
                height={40} 
                sx={{ flexShrink: 0 }} 
                animation="wave"
              />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

// Mobile List Skeleton
export const MobileListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) return null;

  return (
    <Stack spacing={1.5}>
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Skeleton variant="circular" width={40} height={40} animation="wave" />
            <Box flex={1}>
              <Skeleton variant="text" width="70%" height={20} animation="wave" />
              <Skeleton variant="text" width="50%" height={16} sx={{ mt: 0.5 }} animation="wave" />
            </Box>
            <Skeleton variant="rectangular" width={24} height={24} animation="wave" />
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

// Mobile Dashboard Skeleton
export const MobileDashboardSkeleton: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) return null;

  return (
    <Stack spacing={3}>
      {/* Header skeleton */}
      <Box textAlign="center">
        <Skeleton variant="text" width="60%" height={32} sx={{ mx: 'auto' }} animation="wave" />
        <Skeleton variant="text" width="40%" height={20} sx={{ mx: 'auto', mt: 1 }} animation="wave" />
      </Box>

      {/* Stats cards skeleton */}
      <Stack spacing={2}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Skeleton variant="text" width="40%" height={24} animation="wave" />
                <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} animation="wave" />
              </Box>
              <Stack spacing={1.5}>
                {Array.from({ length: 2 }).map((_, itemIndex) => (
                  <Box key={itemIndex} display="flex" alignItems="center" gap={2}>
                    <Skeleton variant="circular" width={32} height={32} animation="wave" />
                    <Box flex={1}>
                      <Skeleton variant="text" width="70%" height={16} animation="wave" />
                      <Skeleton variant="text" width="50%" height={14} sx={{ mt: 0.5 }} animation="wave" />
                    </Box>
                    <Skeleton variant="rectangular" width={16} height={16} animation="wave" />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
};

// Mobile Loading Overlay
interface MobileLoadingOverlayProps {
  open: boolean;
  message?: string;
  progress?: number;
  type?: 'loading' | 'uploading' | 'processing' | 'success' | 'error';
  onRetry?: () => void;
}

export const MobileLoadingOverlay: React.FC<MobileLoadingOverlayProps> = ({
  open,
  message = 'Loading...',
  progress,
  type = 'loading',
  onRetry
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) return null;

  const getIcon = () => {
    switch (type) {
      case 'uploading':
        return <CloudUploadIcon sx={{ fontSize: 48, mb: 2, color: 'primary.main' }} />;
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 48, mb: 2, color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 48, mb: 2, color: 'error.main' }} />;
      default:
        return (
          <CircularProgress 
            size={48} 
            sx={{ mb: 2 }}
            {...(progress !== undefined && { variant: 'determinate', value: progress })}
          />
        );
    }
  };

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.modal + 1,
        flexDirection: 'column',
        backgroundColor: 'rgba(0, 0, 0, 0.8)'
      }}
      open={open}
    >
      <Fade in={open} timeout={300}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            p: 3,
            borderRadius: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            maxWidth: '80%'
          }}
        >
          {getIcon()}
          
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            {message}
          </Typography>

          {progress !== undefined && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.primary.main
                  }
                }}
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {progress.toFixed(0)}%
              </Typography>
            </Box>
          )}

          {type === 'error' && onRetry && (
            <Box sx={{ mt: 2 }}>
              <button
                onClick={onRetry}
                style={{
                  background: theme.palette.primary.main,
                  color: 'white',
                  border: 'none',
                  borderRadius: 24,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 48
                }}
              >
                <RefreshIcon sx={{ fontSize: 20 }} />
                Try Again
              </button>
            </Box>
          )}
        </Box>
      </Fade>
    </Backdrop>
  );
};

// Pull to Refresh Loading
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  disabled = false
}) => {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile || disabled) {
    return <>{children}</>;
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    
    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, threshold * 1.5));
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    setStartY(0);
  };

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <Box
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{ position: 'relative' }}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: Math.max(pullDistance, isRefreshing ? 60 : 0),
            backgroundColor: theme.palette.primary.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            transition: isRefreshing ? 'height 0.3s ease' : 'none'
          }}
        >
          <Grow in={pullDistance >= threshold || isRefreshing}>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress 
                size={24} 
                sx={{ color: 'white' }}
                {...(isRefreshing && { style: { animation: 'spin 1s linear infinite' } })}
              />
              <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                {isRefreshing ? 'Refreshing...' : pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
              </Typography>
            </Box>
          </Grow>
        </Box>
      )}

      <Box sx={{ 
        transform: `translateY(${Math.max(pullDistance, isRefreshing ? 60 : 0)}px)`,
        transition: isRefreshing ? 'transform 0.3s ease' : 'none'
      }}>
        {children}
      </Box>
    </Box>
  );
};

// Touch Ripple Effect (Custom implementation for better mobile experience)
interface TouchRippleProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const TouchRipple: React.FC<TouchRippleProps> = ({
  children,
  onClick,
  disabled = false,
  className
}) => {
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) {
    return (
      <div onClick={onClick} className={className}>
        {children}
      </div>
    );
  }

  const addRipple = (event: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const newRipple = {
      id: Date.now(),
      x,
      y
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);

    onClick?.();
  };

  return (
    <Box
      onTouchStart={addRipple}
      onClick={addRipple}
      className={className}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      {children}
      
      {ripples.map(ripple => (
        <Box
          key={ripple.id}
          sx={{
            position: 'absolute',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            pointerEvents: 'none',
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            animation: 'ripple 0.6s ease-out',
            '@keyframes ripple': {
              to: {
                width: '200px',
                height: '200px',
                left: ripple.x - 100,
                top: ripple.y - 100,
                opacity: 0
              }
            }
          }}
        />
      ))}
    </Box>
  );
};

export default {
  MobileCardSkeleton,
  MobileListSkeleton,
  MobileDashboardSkeleton,
  MobileLoadingOverlay,
  PullToRefresh,
  TouchRipple
};