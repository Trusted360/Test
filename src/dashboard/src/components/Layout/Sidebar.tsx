import React from 'react';
import { 
  Drawer, 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Toolbar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  Business as BusinessIcon,
  Assignment as ChecklistIcon,
  Videocam as VideoIcon,
  ManageAccounts as PropertyManagerIcon,
  People as PeopleIcon,
  Description as SOPIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

const drawerWidth = 240;

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Admin access check - check both new roles system and old admin_level for backwards compatibility
  const hasAdminAccess = React.useMemo(() => {
    // Check new roles system first
    if (user?.roles && Array.isArray(user.roles)) {
      return user.roles.includes('admin') || user.roles.includes('super_admin');
    }
    
    // Fallback to old admin_level system
    const adminLevel = user?.admin_level;
    return adminLevel && adminLevel !== 'none';
  }, [user?.admin_level, user?.roles]);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Properties', icon: <BusinessIcon />, path: '/properties' },
    { text: 'Checklists', icon: <ChecklistIcon />, path: '/checklists' },
    { text: 'SOPs', icon: <SOPIcon />, path: '/sops' },
    { text: 'Video Analysis', icon: <VideoIcon />, path: '/video' },
    { text: 'Property Audits', icon: <PropertyManagerIcon />, path: '/property-manager' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    ...(hasAdminAccess ? [
      { text: 'Users', icon: <PeopleIcon />, path: '/users' },
      { text: 'Admin Portal', icon: <AdminIcon />, path: '/admin' }
    ] : []),
  ];


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    // Close drawer on mobile after navigation
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      sx={{
        width: isMobile ? drawerWidth : (open ? drawerWidth : 64),
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isMobile ? drawerWidth : (open ? drawerWidth : 64),
          boxSizing: 'border-box',
          borderRight: `1px solid ${theme.palette.divider}`,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
          whiteSpace: 'nowrap',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'hidden' }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                sx={{
                  minHeight: isMobile ? 56 : 48, // Larger touch targets on mobile
                  justifyContent: (isMobile || open) ? 'initial' : 'center',
                  px: isMobile ? 3 : 2.5, // More padding on mobile
                  py: isMobile ? 1.5 : 1, // Vertical padding for thumb-friendly spacing
                  mb: isMobile ? 0.5 : 0, // Small margin between items on mobile
                  backgroundColor: location.pathname === item.path ?
                    theme.palette.action.selected : 'transparent',
                  borderRadius: isMobile ? 2 : 0, // Rounded corners on mobile for better visual feedback
                  mx: isMobile ? 1 : 0, // Side margins on mobile
                  transition: theme.transitions.create(['background-color', 'transform'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                  '&:hover': {
                    backgroundColor: location.pathname === item.path ?
                      theme.palette.action.selected :
                      theme.palette.action.hover,
                    transform: isMobile ? 'scale(1.02)' : 'none', // Subtle scale on mobile
                  },
                  '&:active': {
                    transform: isMobile ? 'scale(0.98)' : 'none', // Touch feedback
                    backgroundColor: theme.palette.action.selected,
                  },
                }}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: (isMobile || open) ? 3 : 'auto',
                    justifyContent: 'center',
                    '& .MuiSvgIcon-root': {
                      fontSize: isMobile ? '1.5rem' : '1.25rem', // Larger icons on mobile
                      color: location.pathname === item.path ?
                        theme.palette.primary.main :
                        theme.palette.text.primary,
                    }
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    opacity: (isMobile || open) ? 1 : 0,
                    '& .MuiTypography-root': {
                      fontSize: isMobile ? '1rem' : '0.875rem', // Larger text on mobile
                      fontWeight: location.pathname === item.path ? 600 : 400,
                      color: location.pathname === item.path ?
                        theme.palette.primary.main :
                        theme.palette.text.primary,
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              sx={{
                minHeight: isMobile ? 56 : 48, // Larger touch targets on mobile
                justifyContent: (isMobile || open) ? 'initial' : 'center',
                px: isMobile ? 3 : 2.5, // More padding on mobile
                py: isMobile ? 1.5 : 1, // Vertical padding for thumb-friendly spacing
                borderRadius: isMobile ? 2 : 0, // Rounded corners on mobile
                mx: isMobile ? 1 : 0, // Side margins on mobile
                transition: theme.transitions.create(['background-color', 'transform'], {
                  duration: theme.transitions.duration.shorter,
                }),
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                  transform: isMobile ? 'scale(1.02)' : 'none', // Subtle scale on mobile
                },
                '&:active': {
                  transform: isMobile ? 'scale(0.98)' : 'none', // Touch feedback
                  backgroundColor: theme.palette.action.selected,
                },
              }}
              onClick={handleLogout}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: (isMobile || open) ? 3 : 'auto',
                  justifyContent: 'center',
                  '& .MuiSvgIcon-root': {
                    fontSize: isMobile ? '1.5rem' : '1.25rem', // Larger icons on mobile
                    color: theme.palette.error.main, // Red color for logout
                  }
                }}
              >
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                sx={{
                  opacity: (isMobile || open) ? 1 : 0,
                  '& .MuiTypography-root': {
                    fontSize: isMobile ? '1rem' : '0.875rem', // Larger text on mobile
                    fontWeight: 500,
                    color: theme.palette.error.main, // Red color for logout
                  }
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
