// frontend/src/components/layout/MainLayout.js

import React, { useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  Chip,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Videocam as VideocamIcon,
  Search as SearchIcon,
  AccountCircle as AccountCircleIcon,
  VideoLibrary as VideoLibraryIcon,
  Logout as LogoutIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Visibility as VisibilityIcon,
  Assessment as AssessmentIcon,
  NotificationsActive as NotificationsActiveIcon,
  Psychology as PsychologyIcon,
  Description as DescriptionIcon,
  Shield as ShieldIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const drawerWidth = 320;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: 0,
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    minHeight: '100vh',
    backgroundColor: '#fafafa',
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
    [theme.breakpoints.up('md')]: {
      marginLeft: 0,
    },
  }),
);

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2, 2.5),
  minHeight: 80,
  background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
  color: 'white',
  justifyContent: 'flex-start',
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundColor: 'white',
    borderRight: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  },
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: 'white',
  borderBottom: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  '& .MuiToolbar-root': {
    minHeight: 72,
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
  },
}));

const SecurityBrand = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  '& .brand-icon': {
    fontSize: 32,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
    borderRadius: 8,
    padding: 8,
    backdropFilter: 'blur(10px)',
  },
  '& .brand-text': {
    fontFamily: '"Inter", sans-serif',
    fontWeight: 800,
    fontSize: '1.25rem',
    letterSpacing: '-0.02em',
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  '& .brand-subtitle': {
    fontFamily: '"Inter", sans-serif',
    fontWeight: 400,
    fontSize: '0.75rem',
    opacity: 0.9,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
});

const NavigationSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 1.5),
}));

const SectionHeader = styled(Typography)(({ theme }) => ({
  fontFamily: '"Inter", sans-serif',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: theme.spacing(1),
  paddingLeft: theme.spacing(1),
}));

const NavListItem = styled(ListItemButton)(({ theme, active }) => ({
  borderRadius: 12,
  marginBottom: 4,
  padding: '12px 16px',
  minHeight: 56,
  backgroundColor: active ? '#3b82f6' : 'transparent',
  color: active ? 'white' : '#374151',
  transition: 'all 0.2s ease',
  border: active ? 'none' : '1px solid transparent',
  boxShadow: active ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
  '&:hover': {
    backgroundColor: active ? '#2563eb' : '#f9fafb',
    border: active ? 'none' : '1px solid #e5e7eb',
    transform: 'translateY(-1px)',
    boxShadow: active 
      ? '0 6px 16px rgba(59, 130, 246, 0.4)'
      : '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  '& .MuiListItemIcon-root': {
    minWidth: 40,
    color: active ? 'white' : '#6b7280',
  },
  '& .nav-badge': {
    marginLeft: 'auto',
  },
}));

const UserSection = styled(Box)(({ theme }) => ({
  marginTop: 'auto',
  padding: theme.spacing(2, 1.5),
  borderTop: '1px solid #f3f4f6',
  backgroundColor: '#fafafa',
}));

const MainLayout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);

  const coreMenuItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/',
      description: 'System overview and security status',
      badge: null
    },
    { 
      text: 'Live Descriptions', 
      icon: <DescriptionIcon />, 
      path: '/live-descriptions',
      description: 'Real-time AI surveillance analysis',
      badge: 'AI'
    },
  ];

  const monitoringMenuItems = [
    { 
      text: 'Stream Management', 
      icon: <VideocamIcon />, 
      path: '/streams',
      description: 'Camera feeds and configurations'
    },
    { 
      text: 'Stored Videos', 
      icon: <VideoLibraryIcon />, 
      path: '/stored-videos',
      description: 'Recorded surveillance footage'
    },
    { 
      text: 'Event Search', 
      icon: <SearchIcon />, 
      path: '/event-search',
      description: 'Search security events and incidents'
    },
    { 
      text: 'Vision Search', 
      icon: <VisibilityIcon />, 
      path: '/vision-search',
      description: 'AI-powered content analysis'
    },
  ];

  const securityMenuItems = [
    { 
      text: 'Alarm Triggers', 
      icon: <NotificationsActiveIcon />, 
      path: '/alarm-triggers',
      description: 'Security alerts and notifications'
    },
    { 
      text: 'Behavior Detection', 
      icon: <PsychologyIcon />, 
      path: '/behavior-detection',
      description: 'Advanced behavioral analytics'
    },
    { 
      text: 'Reports', 
      icon: <AssessmentIcon />, 
      path: '/reports',
      description: 'Security and forensic reports'
    },
  ];

  const adminMenuItems = [
    { 
      text: 'User Management', 
      icon: <SupervisorAccountIcon />, 
      path: '/users',
      description: 'System users and permissions',
      adminOnly: true
    },
  ];

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    if (isMobile) {
      setOpen(false);
    }
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
  };

  const handleProfile = () => {
    navigate('/profile');
    handleProfileMenuClose();
  };

  const isMenuOpen = Boolean(anchorEl);

  const getCurrentPageTitle = () => {
    const allItems = [...coreMenuItems, ...monitoringMenuItems, ...securityMenuItems, ...adminMenuItems];
    const currentItem = allItems.find(item => item.path === location.pathname);
    return currentItem?.text || 'Security Monitoring System';
  };

  const renderNavSection = (title, items) => (
    <NavigationSection>
      <SectionHeader>{title}</SectionHeader>
      <List disablePadding>
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding>
              <NavListItem
                active={isActive}
                onClick={() => handleMenuClick(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  secondary={item.description}
                  primaryTypographyProps={{ 
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    fontFamily: '"Inter", sans-serif',
                  }}
                  secondaryTypographyProps={{ 
                    fontSize: '0.75rem',
                    fontFamily: '"Inter", sans-serif',
                    color: isActive ? 'rgba(255,255,255,0.8)' : '#9ca3af',
                    marginTop: '2px',
                  }}
                />
                {item.badge && (
                  <Chip
                    label={item.badge}
                    size="small"
                    className="nav-badge"
                    sx={{
                      height: 20,
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#e0f2fe',
                      color: isActive ? 'white' : '#0277bd',
                      border: 'none',
                    }}
                  />
                )}
              </NavListItem>
            </ListItem>
          );
        })}
      </List>
    </NavigationSection>
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DrawerHeader>
        <SecurityBrand>
          <ShieldIcon className="brand-icon" />
          <Box>
            <Typography className="brand-text">
              SecureTech
            </Typography>
            <Typography className="brand-subtitle">
              Monitoring System
            </Typography>
          </Box>
        </SecurityBrand>
      </DrawerHeader>

      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {renderNavSection('Core', coreMenuItems)}
        {renderNavSection('Monitoring', monitoringMenuItems)}
        {renderNavSection('Security', securityMenuItems)}
        
        {user?.role === 'admin' && renderNavSection('Administration', adminMenuItems)}
      </Box>

      <UserSection>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar 
            sx={{ 
              width: 36, 
              height: 36, 
              bgcolor: '#3b82f6',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              color: '#374151',
              fontFamily: '"Inter", sans-serif',
            }}>
              {user?.username}
            </Typography>
            <Typography sx={{ 
              fontSize: '0.75rem', 
              color: '#6b7280',
              fontFamily: '"Inter", sans-serif',
            }}>
              {user?.role === 'admin' ? 'Administrator' : 'Operator'}
            </Typography>
          </Box>
          <Badge badgeContent={3} color="error" variant="dot">
            <NotificationsIcon sx={{ color: '#9ca3af', fontSize: 20 }} />
          </Badge>
        </Box>
      </UserSection>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <CssBaseline />
      
      <StyledAppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { md: 'none' },
              color: '#374151'
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography 
            variant="h5" 
            component="h1"
            sx={{ 
              flexGrow: 1,
              color: '#111827',
              fontWeight: 700,
              fontFamily: '"Inter", sans-serif',
              letterSpacing: '-0.025em',
            }}
          >
            {getCurrentPageTitle()}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge badgeContent={5} color="error">
              <IconButton
                sx={{ 
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  '&:hover': { backgroundColor: '#f3f4f6' }
                }}
              >
                <NotificationsIcon sx={{ color: '#6b7280' }} />
              </IconButton>
            </Badge>
            
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              onClick={handleProfileMenuOpen}
              sx={{
                p: 0,
                ml: 1,
              }}
            >
              <Avatar 
                sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: '#3b82f6',
                  fontWeight: 600,
                  border: '2px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </StyledAppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <StyledDrawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={open}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
        >
          {drawer}
        </StyledDrawer>
      </Box>

      <Main open={open}>
        <Box sx={{ minHeight: 72 }} /> {/* Spacer for fixed header */}
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Main>

      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        id="primary-search-account-menu"
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={isMenuOpen}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            minWidth: 200,
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #f3f4f6' }}>
          <Typography sx={{ 
            fontWeight: 600, 
            fontSize: '0.875rem',
            fontFamily: '"Inter", sans-serif',
            color: '#111827'
          }}>
            {user?.username}
          </Typography>
          <Typography sx={{ 
            fontSize: '0.75rem', 
            color: '#6b7280',
            fontFamily: '"Inter", sans-serif',
          }}>
            {user?.role === 'admin' ? 'System Administrator' : 'Security Operator'}
          </Typography>
        </Box>
        
        <MenuItem 
          onClick={handleProfile}
          sx={{ 
            py: 1.5, 
            px: 2,
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.875rem',
          }}
        >
          <AccountCircleIcon sx={{ mr: 2, color: '#6b7280' }} />
          Profile Settings
        </MenuItem>
        
        <MenuItem 
          onClick={handleLogout}
          sx={{ 
            py: 1.5, 
            px: 2,
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.875rem',
            color: '#ef4444',
            '&:hover': { backgroundColor: '#fef2f2' }
          }}
        >
          <LogoutIcon sx={{ mr: 2, color: '#ef4444' }} />
          Sign Out
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default MainLayout;