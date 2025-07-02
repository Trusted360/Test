import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Avatar, 
  Box, 
  Menu, 
  MenuItem, 
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  AccountCircle 
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  toggleDrawer: () => void;
  open: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleDrawer, open }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        width: isMobile ? '100%' : (open ? `calc(100% - 240px)` : `calc(100% - 64px)`),
        marginLeft: isMobile ? 0 : (open ? '240px' : '64px'),
        transition: (theme) => theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={toggleDrawer}
          sx={{ marginRight: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <img 
            src="/assets/logos/trusted360-logo-small.svg" 
            alt="Trusted 360" 
            style={{ 
              height: isMobile ? '28px' : '32px', 
              width: 'auto' 
            }}
          />
        </Box>
        
        {user && (
          <Box>
            <Tooltip title="Account settings">
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                {user.name ? (
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                    {user.name.charAt(0)}
                  </Avatar>
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
            </Tooltip>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>Profile</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
