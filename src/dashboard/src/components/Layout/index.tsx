import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
// import ChatWidget from '../ChatWidget';
import MobileBottomNavigation from '../BottomNavigation';

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
      <Box sx={{
        display: 'flex',
        minHeight: '100dvh', // Dynamic viewport height for mobile
        flexDirection: 'column'
      }}>
        <Header toggleDrawer={toggleDrawer} open={open} />
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar open={open} onClose={handleDrawerClose} />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              // Mobile-optimized padding
              p: {
                xs: 1.5, // Reduced padding on mobile for more content space
                sm: 2,
                md: 3
              },
              width: isMobile ? '100%' : { sm: `calc(100% - ${open ? 240 : 64}px)` },
              marginTop: '64px',
              // Safe area support for mobile devices
              paddingTop: {
                xs: 'max(1.5rem, env(safe-area-inset-top))',
                sm: 2,
                md: 3
              },
              paddingBottom: {
                xs: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 60px))', // Account for bottom nav
                sm: 2,
                md: 3
              },
              paddingLeft: {
                xs: 'max(1.5rem, env(safe-area-inset-left))',
                sm: 2,
                md: 3
              },
              paddingRight: {
                xs: 'max(1.5rem, env(safe-area-inset-right))',
                sm: 2,
                md: 3
              },
              transition: (theme) =>
                theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
            }}
          >
            <Container
              maxWidth={isMobile ? false : "lg"}
              disableGutters={isMobile}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                // Remove container padding on mobile for full-width usage
                ...(isMobile && {
                  maxWidth: 'none',
                  width: '100%',
                  padding: 0,
                  margin: 0
                }),
                // Desktop spacing
                ...(!isMobile && {
                  mt: 2,
                  mb: 2
                })
              }}
            >
              <Outlet />
            </Container>
          </Box>
        </Box>
      </Box>
      {/* <ChatWidget /> */}
      <MobileBottomNavigation />
    </>
  );
};

export default Layout;
