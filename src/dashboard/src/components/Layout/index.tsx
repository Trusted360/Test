import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import ChatWidget from '../ChatWidget';

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Initialize sidebar state from localStorage, defaulting to collapsed
  const [open, setOpen] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      return saved ? JSON.parse(saved) : false; // Default collapsed
    }
    return false;
  });

  const toggleDrawer = () => {
    const newState = !open;
    setOpen(newState);
    // Save user preference to localStorage
    if (!isMobile) {
      localStorage.setItem('sidebarOpen', JSON.stringify(newState));
    }
  };

  const handleDrawerClose = () => {
    setOpen(false);
    // Don't save close state on mobile as it should always close
    if (!isMobile) {
      localStorage.setItem('sidebarOpen', 'false');
    }
  };

  // Close drawer on mobile when screen size changes, restore preference on desktop
  React.useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      // Restore saved preference for desktop, defaulting to collapsed
      const saved = localStorage.getItem('sidebarOpen');
      setOpen(saved ? JSON.parse(saved) : false);
    }
  }, [isMobile]);

  return (
    <>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Header toggleDrawer={toggleDrawer} open={open} />
        <Sidebar open={open} onClose={handleDrawerClose} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 }, // Responsive padding
            width: isMobile ? '100%' : { sm: `calc(100% - ${open ? 240 : 64}px)` },
            marginTop: '64px',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          }}
        >
          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Outlet />
          </Container>
        </Box>
      </Box>
      <ChatWidget />
    </>
  );
};

export default Layout;
