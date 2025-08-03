import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Zoom
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Star as StarIcon,
  Share as ShareIcon,
  More as MoreIcon,
  SwipeLeft as SwipeLeftIcon,
  SwipeRight as SwipeRightIcon
} from '@mui/icons-material';

export interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  backgroundColor?: string;
  action: () => void;
}

interface SwipeGestureProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  maxSwipeDistance?: number;
  disabled?: boolean;
  hapticFeedback?: boolean;
  className?: string;
}

export const SwipeGesture: React.FC<SwipeGestureProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  maxSwipeDistance = 200,
  disabled = false,
  hapticFeedback = true,
  className
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isVerticalScroll, setIsVerticalScroll] = useState(false);
  const [activeAction, setActiveAction] = useState<SwipeAction | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();

  // Don't render swipe functionality on desktop
  if (!isMobile || disabled) {
    return <>{children}</>;
  }

  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticFeedback || !('vibrate' in navigator)) return;
    
    try {
      // Basic vibration patterns for different feedback types
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50]
      };
      navigator.vibrate(patterns[type]);
    } catch (error) {
      // Vibration not supported or blocked
    }
  }, [hapticFeedback]);

  const getActiveActions = useCallback(() => {
    if (swipeDistance > 0) return rightActions;
    if (swipeDistance < 0) return leftActions;
    return [];
  }, [swipeDistance, leftActions, rightActions]);

  const getActionAtDistance = useCallback((distance: number) => {
    const actions = getActiveActions();
    if (actions.length === 0) return null;

    const absDistance = Math.abs(distance);
    const actionIndex = Math.min(
      Math.floor(absDistance / (threshold * 0.8)),
      actions.length - 1
    );
    
    return actions[actionIndex] || null;
  }, [getActiveActions, threshold]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    setStartX(touch.clientX);
    setStartY(touch.clientY);
    setIsDragging(true);
    setIsVerticalScroll(false);
    setSwipeDistance(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || disabled) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    // Detect vertical scrolling
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
      setIsVerticalScroll(true);
      return;
    }

    if (isVerticalScroll) return;

    // Prevent vertical scrolling during horizontal swipe
    e.preventDefault();

    const clampedDistance = Math.max(
      -maxSwipeDistance,
      Math.min(maxSwipeDistance, deltaX)
    );

    // Update swipe distance with animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      setSwipeDistance(clampedDistance);
      
      // Check for action activation
      const newActiveAction = getActionAtDistance(clampedDistance);
      if (newActiveAction !== activeAction) {
        setActiveAction(newActiveAction);
        triggerHapticFeedback('light');
      }
    });
  };

  const handleTouchEnd = () => {
    if (!isDragging || disabled || isVerticalScroll) {
      setIsDragging(false);
      setIsVerticalScroll(false);
      setSwipeDistance(0);
      setActiveAction(null);
      return;
    }

    const absDistance = Math.abs(swipeDistance);
    
    // Check if threshold is reached
    if (absDistance >= threshold) {
      const action = getActionAtDistance(swipeDistance);
      
      if (action) {
        triggerHapticFeedback('medium');
        action.action();
      } else {
        // Fallback to directional callbacks
        if (swipeDistance > 0 && onSwipeRight) {
          triggerHapticFeedback('medium');
          onSwipeRight();
        } else if (swipeDistance < 0 && onSwipeLeft) {
          triggerHapticFeedback('medium');
          onSwipeLeft();
        }
      }
    }

    // Reset state
    setIsDragging(false);
    setIsVerticalScroll(false);
    setSwipeDistance(0);
    setActiveAction(null);
  };

  const renderActionBackground = () => {
    if (swipeDistance === 0) return null;

    const actions = getActiveActions();
    if (actions.length === 0) return null;

    const isRightSwipe = swipeDistance > 0;
    const absDistance = Math.abs(swipeDistance);
    const progress = Math.min(absDistance / threshold, 1);

    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [isRightSwipe ? 'left' : 'right']: 0,
          width: absDistance,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isRightSwipe ? 'flex-start' : 'flex-end',
          backgroundColor: activeAction?.backgroundColor || 
            (activeAction?.color === 'error' ? theme.palette.error.main :
             activeAction?.color === 'success' ? theme.palette.success.main :
             activeAction?.color === 'warning' ? theme.palette.warning.main :
             theme.palette.primary.main),
          transition: isDragging ? 'none' : 'all 0.3s ease',
          overflow: 'hidden'
        }}
      >
        {/* Action Icons */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2,
            opacity: progress,
            transform: `scale(${0.8 + (progress * 0.2)})`
          }}
        >
          {actions.slice(0, Math.max(1, Math.floor(absDistance / (threshold * 0.8)))).map((action, index) => (
            <Zoom
              key={index}
              in={absDistance > threshold * 0.5 * (index + 1)}
              timeout={200}
            >
              <Box
                sx={{
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 48
                }}
              >
                {action.icon}
                <Typography variant="caption" sx={{ mt: 0.5, fontSize: 10 }}>
                  {action.label}
                </Typography>
              </Box>
            </Zoom>
          ))}
        </Box>

        {/* Progress indicator */}
        <Box
          sx={{
            position: 'absolute',
            [isRightSwipe ? 'right' : 'left']: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            transform: `scaleY(${progress})`,
            transformOrigin: 'center'
          }}
        />
      </Box>
    );
  };

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        touchAction: isDragging && !isVerticalScroll ? 'none' : 'auto',
        userSelect: 'none'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {renderActionBackground()}
      
      <Box
        sx={{
          transform: `translateX(${swipeDistance}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease',
          position: 'relative',
          zIndex: 1,
          backgroundColor: theme.palette.background.paper
        }}
      >
        {children}
      </Box>

      {/* Swipe hint overlay */}
      {isDragging && Math.abs(swipeDistance) < threshold * 0.3 && (
        <Fade in timeout={200}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              [swipeDistance > 0 ? 'right' : 'left']: 16,
              transform: 'translateY(-50%)',
              zIndex: 2,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              borderRadius: 2,
              px: 2,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              pointerEvents: 'none'
            }}
          >
            {swipeDistance > 0 ? <SwipeRightIcon /> : <SwipeLeftIcon />}
            <Typography variant="caption">
              Keep swiping...
            </Typography>
          </Box>
        </Fade>
      )}
    </Box>
  );
};

// Quick Swipe Actions for common use cases
export const SwipeToComplete: React.FC<{
  children: React.ReactNode;
  onComplete: () => void;
  completed?: boolean;
  disabled?: boolean;
}> = ({ children, onComplete, completed = false, disabled = false }) => {
  const completeAction: SwipeAction = {
    icon: <CheckCircleIcon />,
    label: completed ? 'Undo' : 'Complete',
    color: 'success',
    action: onComplete
  };

  return (
    <SwipeGesture
      rightActions={[completeAction]}
      disabled={disabled}
    >
      {children}
    </SwipeGesture>
  );
};

export const SwipeToDelete: React.FC<{
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
}> = ({ children, onDelete, disabled = false }) => {
  const deleteAction: SwipeAction = {
    icon: <DeleteIcon />,
    label: 'Delete',
    color: 'error',
    action: onDelete
  };

  return (
    <SwipeGesture
      leftActions={[deleteAction]}
      disabled={disabled}
    >
      {children}
    </SwipeGesture>
  );
};

export const SwipeActions: React.FC<{
  children: React.ReactNode;
  onComplete?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onStar?: () => void;
  completed?: boolean;
  disabled?: boolean;
}> = ({ 
  children, 
  onComplete, 
  onDelete, 
  onEdit,
  onArchive,
  onStar,
  completed = false, 
  disabled = false 
}) => {
  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];

  if (onDelete) {
    leftActions.push({
      icon: <DeleteIcon />,
      label: 'Delete',
      color: 'error',
      action: onDelete
    });
  }

  if (onArchive) {
    leftActions.push({
      icon: <ArchiveIcon />,
      label: 'Archive',
      color: 'warning',
      action: onArchive
    });
  }

  if (onComplete) {
    rightActions.push({
      icon: <CheckCircleIcon />,
      label: completed ? 'Undo' : 'Complete',
      color: 'success',
      action: onComplete
    });
  }

  if (onEdit) {
    rightActions.push({
      icon: <EditIcon />,
      label: 'Edit',
      color: 'primary',
      action: onEdit
    });
  }

  if (onStar) {
    rightActions.push({
      icon: <StarIcon />,
      label: 'Star',
      color: 'warning',
      action: onStar
    });
  }

  return (
    <SwipeGesture
      leftActions={leftActions}
      rightActions={rightActions}
      disabled={disabled}
    >
      {children}
    </SwipeGesture>
  );
};

export default SwipeGesture;