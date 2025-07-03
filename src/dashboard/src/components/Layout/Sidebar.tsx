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
  People as PeopleIcon
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
                  minHeight: 48,
                  justifyContent: (isMobile || open) ? 'initial' : 'center',
                  px: 2.5,
                  backgroundColor: location.pathname === item.path ? 
                    theme.palette.action.selected : 'transparent',
                }}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: (isMobile || open) ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ opacity: (isMobile || open) ? 1 : 0 }} 
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
                minHeight: 48,
                justifyContent: (isMobile || open) ? 'initial' : 'center',
                px: 2.5,
              }}
              onClick={handleLogout}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: (isMobile || open) ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Logout" 
                sx={{ opacity: (isMobile || open) ? 1 : 0 }} 
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
