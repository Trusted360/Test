import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import ChatWidget from '../ChatWidget';

const Layout: React.FC = () => {
  const [open, setOpen] = React.useState(true);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Header toggleDrawer={toggleDrawer} open={open} />
        <Sidebar open={open} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${open ? 240 : 64}px)` },
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
