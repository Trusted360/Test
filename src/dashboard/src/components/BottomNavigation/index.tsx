import React from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  useMediaQuery,
  Badge,
  Box
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Assignment as ChecklistIcon,
  Description as SOPIcon,
  Videocam as VideoIcon,
  Settings as SettingsIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material';

interface MobileBottomNavigationProps {
  className?: string;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({ className }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Don't render on desktop or certain pages
  if (!isMobile || location.pathname.includes('/login') || location.pathname.includes('/register')) {
    return null;
  }
  
  const navigationItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'Properties', icon: <BusinessIcon />, path: '/properties' },
    { label: 'Checklists', icon: <ChecklistIcon />, path: '/checklists' },
    { label: 'SOPs', icon: <SOPIcon />, path: '/sops' },
    { label: 'Settings', icon: <SettingsIcon />, path: '/settings' }
  ];

  // Find current active index
  const currentIndex = navigationItems.findIndex(item => 
    location.pathname.startsWith(item.path)
  );

  const handleNavigation = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue >= 0 && newValue < navigationItems.length) {
      navigate(navigationItems[newValue].path);
    }
  };

  // Quick actions for Speed Dial
  const quickActions = [
    {
      icon: <ChecklistIcon />,
      name: 'New Checklist',
      action: () => navigate('/checklists/new')
    },
    {
      icon: <SOPIcon />,
      name: 'Create SOP',
      action: () => navigate('/sops/create')
    },
    {
      icon: <BusinessIcon />,
      name: 'Add Property',
      action: () => navigate('/properties/new')
    },
    {
      icon: <VideoIcon />,
      name: 'Video Analysis',
      action: () => navigate('/video')
    }
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.appBar,
          borderTop: `1px solid ${theme.palette.divider}`,
          paddingBottom: 'env(safe-area-inset-bottom)', // Safe area for iOS
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[8]
        }}
        elevation={8}
        className={className}
      >
        <BottomNavigation
          value={currentIndex >= 0 ? currentIndex : false}
          onChange={handleNavigation}
          showLabels
          sx={{
            height: 64, // Standard mobile bottom nav height
            paddingBottom: 'env(safe-area-inset-bottom)',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: theme.spacing(0.5, 1),
              transition: theme.transitions.create(['color', 'transform'], {
                duration: theme.transitions.duration.shorter,
              }),
              '&:active': {
                transform: 'scale(0.95)', // Touch feedback
              },
              '& .MuiSvgIcon-root': {
                fontSize: '1.5rem', // Larger icons for better touch targets
                marginBottom: theme.spacing(0.25),
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.75rem',
                fontWeight: 500,
                '&.Mui-selected': {
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: theme.palette.primary.main,
                }
              }
            },
            '& .MuiBottomNavigationAction-root.Mui-selected': {
              color: theme.palette.primary.main,
              '& .MuiSvgIcon-root': {
                color: theme.palette.primary.main,
                transform: 'scale(1.1)', // Slightly larger when selected
              }
            }
          }}
        >
          {navigationItems.map((item, index) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={item.icon}
              sx={{
                color: currentIndex === index ? theme.palette.primary.main : theme.palette.text.secondary,
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>

      {/* Floating Action Button for Quick Actions */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{
          position: 'fixed',
          bottom: 80, // Above bottom navigation
          right: 16,
          zIndex: theme.zIndex.speedDial,
          '& .MuiSpeedDial-fab': {
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
            width: 56,
            height: 56,
            // Ensure touch target is at least 44px
            minWidth: 44,
            minHeight: 44,
          }
        }}
        icon={<SpeedDialIcon />}
        direction="up"
      >
        {quickActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.action}
            sx={{
              '& .MuiSpeedDialAction-fab': {
                backgroundColor: theme.palette.background.paper,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
                width: 48,
                height: 48,
                minWidth: 44, // Minimum touch target
                minHeight: 44,
              }
            }}
          />
        ))}
      </SpeedDial>
    </>
  );
};

export default MobileBottomNavigation;