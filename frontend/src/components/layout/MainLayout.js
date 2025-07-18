// client/src/components/layout/MainLayout.js - Fixed ListItem button prop issue

import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
//import { styled, useTheme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Drawer as MuiDrawer,
  Divider,
  IconButton,
  CssBaseline,
  List,
  ListItem,
  ListItemButton, // Import ListItemButton component
  ListItemIcon,
  ListItemText,
  Box,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  Videocam as VideocamIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
  Search as SearchIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  List as ListIcon,
  Add as AddIcon
} from '@mui/icons-material';
import useAuth from '../../hooks/useAuth';

const drawerWidth = 240;

// Styled components
const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  width: open ? drawerWidth : theme.spacing(7),
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    position: 'fixed',
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    overflowX: 'hidden',
    width: open ? drawerWidth : theme.spacing(7),
    [theme.breakpoints.up('sm')]: {
      width: open ? drawerWidth : theme.spacing(9),
    },
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.standard,
    }),
    '&:hover': {
      ...((!open) && {
        width: drawerWidth,  // Match the full drawer width (240px)
        [theme.breakpoints.up('sm')]: {
          width: drawerWidth,
        },
        '& .MuiListItemText-root': {
          opacity: 1,
          transition: theme.transitions.create('opacity', {
            duration: theme.transitions.duration.shorter,
            delay: 50,  // Reduce delay for smoother appearance
          }),
        },
        '& .MuiListItemIcon-root': {
          minWidth: 48,
          marginRight: theme.spacing(1),
        },
      }),
    },
    '& .MuiListItemText-root': {
      opacity: open ? 1 : 0,
      transition: theme.transitions.create('opacity', {
        duration: theme.transitions.duration.shortest,
      }),
    },
    zIndex: theme.zIndex.drawer,
  },
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

// Updated MainContent to have dynamic margins based on drawer state
const MainContent = styled('main', {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.standard,
  }),
  [theme.breakpoints.down('xs')]: {
    padding: theme.spacing(2),
  },
}));

const Username = styled(Typography)(({ theme }) => ({
  marginRight: theme.spacing(2),
}));

const MainLayout = () => {
  //const theme = useTheme(); // This is used in MainContent styled component (passed down via props)
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAdmin, logoutUser } = useAuth();

  // Persist drawer state using localStorage
  const [open, setOpen] = useState(() => {
    const savedState = localStorage.getItem('drawerOpen');
    return savedState ? JSON.parse(savedState) : false;
  });

  // State for expanded menu sections
  const [expandedSection, setExpandedSection] = useState(null);

  // Check if a route is active
  const isActiveRoute = (path) => {
    return location.pathname === path ||
      (path !== '/' && location.pathname.startsWith(path));
  };

  // Toggle expanded section
  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleDrawerOpen = () => {
    setOpen(true);
    localStorage.setItem('drawerOpen', 'true');
  };

  const handleDrawerClose = () => {
    setOpen(false);
    localStorage.setItem('drawerOpen', 'false');
  };

  // Wrap handleNavigation in useCallback to prevent unnecessary recreations
  const handleNavigation = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  const handleStreamClick = () => {
    // If the drawer is not open, directly navigate
    if (!open) {
      handleNavigation('/streams');
      return;
    }

    // Otherwise toggle the expanded section
    toggleSection('streams');

    // If we're not already on the streams page and we're collapsing the section, navigate to streams
    if (expandedSection === 'streams' && !isActiveRoute('/streams')) {
      handleNavigation('/streams');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Toggle drawer with Alt+M
      if (e.altKey && e.key === 'm') {
        setOpen(prev => !prev);
        localStorage.setItem('drawerOpen', (!open).toString());
      }

      // Navigate with number keys while holding Alt
      if (e.altKey) {
        switch (e.key) {
          case '1': handleNavigation('/dashboard'); break;
          case '2': handleNavigation('/streams'); break;
          case '3': handleNavigation('/vision/search'); break;
          case '4': isAdmin() && handleNavigation('/users'); break;
          case '5': handleNavigation('/profile'); break;
          default: break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [open, isAdmin, handleNavigation]); // Now handleNavigation won't change on every render

  // Initialize expanded sections based on current route
  useEffect(() => {
    if (location.pathname.startsWith('/streams') && open) {
      setExpandedSection('streams');
    }
  }, [location.pathname, open]);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Intelligent Surveillance System
          </Typography>
          {currentUser && (
            <Username variant="body1">
              {currentUser.username}
            </Username>
          )}
          <Tooltip title="Logout">
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          <Tooltip title="Dashboard" placement="right" disableHoverListener={open}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleNavigation('/dashboard')}
                sx={{
                  backgroundColor: isActiveRoute('/dashboard') ?
                    'rgba(0, 0, 0, 0.08)' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActiveRoute('/dashboard') ?
                      'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                  }
                }}
              >
                <ListItemIcon>
                  <DashboardIcon color={isActiveRoute('/dashboard') ? "primary" : "inherit"} />
                </ListItemIcon>
                <ListItemText
                  primary="Dashboard"
                  primaryTypographyProps={{
                    color: isActiveRoute('/dashboard') ? "primary" : "inherit"
                  }}
                />
              </ListItemButton>
            </ListItem>
          </Tooltip>

          {/* Streams section with nested menu */}
          <Tooltip title="Streams" placement="right" disableHoverListener={open}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleStreamClick}
                sx={{
                  backgroundColor: isActiveRoute('/streams') ?
                    'rgba(0, 0, 0, 0.08)' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActiveRoute('/streams') ?
                      'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                  }
                }}
              >
                <ListItemIcon>
                  <VideocamIcon color={isActiveRoute('/streams') ? "primary" : "inherit"} />
                </ListItemIcon>
                <ListItemText
                  primary="Stream Management"
                  primaryTypographyProps={{
                    color: isActiveRoute('/streams') ? "primary" : "inherit"
                  }}
                />
                {open && (expandedSection === 'streams' ? <ExpandLessIcon /> : <ExpandMoreIcon />)}
              </ListItemButton>
            </ListItem>
          </Tooltip>

          <Collapse in={expandedSection === 'streams' && open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem disablePadding>
                <ListItemButton
                  sx={{ pl: 4 }}
                  onClick={() => handleNavigation('/streams')}
                  selected={location.pathname === '/streams'}
                >
                  <ListItemIcon>
                    <ListIcon />
                  </ListItemIcon>
                  <ListItemText primary="All Streams" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton
                  sx={{ pl: 4 }}
                  onClick={() => handleNavigation('/streams/add')}
                  selected={location.pathname === '/streams/add'}
                >
                  <ListItemIcon>
                    <AddIcon />
                  </ListItemIcon>
                  <ListItemText primary="Add Stream" />
                </ListItemButton>
              </ListItem>
            </List>
          </Collapse>

          {/* Vision Search */}
          <Tooltip title="Vision Search" placement="right" disableHoverListener={open}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleNavigation('/vision/search')}
                sx={{
                  backgroundColor: isActiveRoute('/vision/search') ?
                    'rgba(0, 0, 0, 0.08)' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActiveRoute('/vision/search') ?
                      'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                  }
                }}
              >
                <ListItemIcon>
                  <SearchIcon color={isActiveRoute('/vision/search') ? "primary" : "inherit"} />
                </ListItemIcon>
                <ListItemText
                  primary="Vision Search"
                  primaryTypographyProps={{
                    color: isActiveRoute('/vision/search') ? "primary" : "inherit"
                  }}
                />
              </ListItemButton>
            </ListItem>
          </Tooltip>

          {/* User Management (admin only) */}
          {isAdmin() && (
            <Tooltip title="User Management" placement="right" disableHoverListener={open}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation('/users')}
                  sx={{
                    backgroundColor: isActiveRoute('/users') ?
                      'rgba(0, 0, 0, 0.08)' : 'transparent',
                    '&:hover': {
                      backgroundColor: isActiveRoute('/users') ?
                        'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  <ListItemIcon>
                    <PeopleIcon color={isActiveRoute('/users') ? "primary" : "inherit"} />
                  </ListItemIcon>
                  <ListItemText
                    primary="User Management"
                    primaryTypographyProps={{
                      color: isActiveRoute('/users') ? "primary" : "inherit"
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </Tooltip>
          )}

          {/* Profile */}
          <Tooltip title="Profile" placement="right" disableHoverListener={open}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleNavigation('/profile')}
                sx={{
                  backgroundColor: isActiveRoute('/profile') ?
                    'rgba(0, 0, 0, 0.08)' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActiveRoute('/profile') ?
                      'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                  }
                }}
              >
                <ListItemIcon>
                  <PersonIcon color={isActiveRoute('/profile') ? "primary" : "inherit"} />
                </ListItemIcon>
                <ListItemText
                  primary="Profile"
                  primaryTypographyProps={{
                    color: isActiveRoute('/profile') ? "primary" : "inherit"
                  }}
                />
              </ListItemButton>
            </ListItem>
          </Tooltip>
        </List>
      </Drawer>
      {/* MainContent uses the theme via styled component props */}
      <MainContent open={open}
      >
        <DrawerHeader />
        <Outlet />
      </MainContent>
    </Box>
  );
};

export default MainLayout;