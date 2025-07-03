import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';

interface VideoAlertIconProps {
  eventType: string;
  size?: number;
  sx?: SxProps<Theme>;
}

const VideoAlertIcon: React.FC<VideoAlertIconProps> = ({ 
  eventType, 
  size = 40,
  sx = {}
}) => {
  const getIconPath = (eventType: string): string | null => {
    const iconMap: { [key: string]: string } = {
      'fire_alarm': '/videoicons/fire.png',
      'fire': '/videoicons/fire.png',
      'malfunction': '/videoicons/malfunction.png',
      'equipment_malfunction': '/videoicons/malfunction.png',
      'motion_detected': '/videoicons/motion.png',
      'motion': '/videoicons/motion.png',
      'person_detected': '/videoicons/motion.png',
      'vehicle_detected': '/videoicons/motion.png',
      'parking_violation': '/videoicons/parking.png',
      'parking': '/videoicons/parking.png',
      'unauthorized_access': '/videoicons/unauthorizedaccess.png',
      'security_breach': '/videoicons/unauthorizedaccess.png',
      'suspicious_activity': '/videoicons/unauthorizedaccess.png'
    };
    
    return iconMap[eventType] || null;
  };

  const iconPath = getIconPath(eventType);
  
  if (!iconPath) {
    // Fallback to a default icon or return null if no custom icon available
    return null;
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sx
      }}
    >
      {/* Blurred background */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${iconPath})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(3px)',
          opacity: 0.3,
          transform: 'scale(1.1)', // Slightly scale to avoid edge artifacts
        }}
      />
      
      {/* Main icon */}
      <Box
        component="img"
        src={iconPath}
        alt={`${eventType} alert`}
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '70%',
          maxHeight: '70%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
        }}
      />
    </Box>
  );
};

export default VideoAlertIcon;