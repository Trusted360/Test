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
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  Business as BusinessIcon,
  Assignment as ChecklistIcon,
  Videocam as VideoIcon,
  Assessment as ReportsIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  open: boolean;
}

const drawerWidth = 240;

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Enhanced admin access check with better debugging
  const hasAdminAccess = React.useMemo(() => {
    const adminLevel = user?.admin_level;
    const hasAccess = adminLevel && adminLevel !== 'none';
    
    // Enhanced debug logging
    console.log('=== SIDEBAR DEBUG ===');
    console.log('Full user object:', user);
    console.log('user?.admin_level:', adminLevel);
    console.log('typeof user?.admin_level:', typeof adminLevel);
    console.log('adminLevel !== "none":', adminLevel !== 'none');
    console.log('hasAccess result:', hasAccess);
    console.log('localStorage user:', localStorage.getItem('user'));
    
    // Try to parse localStorage directly as fallback
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('Parsed localStorage user:', parsedUser);
        console.log('Parsed user admin_level:', parsedUser.admin_level);
      }
    } catch (e) {
      console.log('Error parsing localStorage user:', e);
    }
    
    console.log('==================');
    
    return hasAccess;
  }, [user?.admin_level]);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Properties', icon: <BusinessIcon />, path: '/properties' },
    { text: 'Checklists', icon: <ChecklistIcon />, path: '/checklists' },
    { text: 'Video Analysis', icon: <VideoIcon />, path: '/video' },
    { text: 'Reports', icon: <ReportsIcon />, path: '/reports' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    ...(hasAdminAccess ? [{ text: 'Admin Portal', icon: <AdminIcon />, path: '/admin' }] : []),
  ];

  // Additional debug logging for menu items
  console.log('Menu items:', menuItems.map(item => item.text));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : 64,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : 64,
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
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  backgroundColor: location.pathname === item.path ? 
                    theme.palette.action.selected : 'transparent',
                }}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ opacity: open ? 1 : 0 }} 
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
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
              }}
              onClick={handleLogout}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Logout" 
                sx={{ opacity: open ? 1 : 0 }} 
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
