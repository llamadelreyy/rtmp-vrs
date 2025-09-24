// frontend/src/pages/Dashboard.js

import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  Shield as ShieldIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import useStreams from '../hooks/useStreams';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import RecentEvents from '../components/dashboard/RecentEvents';

const Root = styled('div')({
  flexGrow: 1,
  backgroundColor: '#fafafa',
  minHeight: '100vh',
});

const PageHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  '& .page-title': {
    fontFamily: '"Inter", sans-serif',
    fontSize: '2rem',
    fontWeight: 800,
    color: '#111827',
    letterSpacing: '-0.04em',
    marginBottom: theme.spacing(1),
  },
  '& .page-subtitle': {
    fontFamily: '"Inter", sans-serif',
    fontSize: '1rem',
    color: '#6b7280',
    fontWeight: 400,
  },
}));

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  background: 'white',
  borderRadius: 16,
  border: '1px solid #f3f4f6',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    borderColor: '#e5e7eb',
  },
}));

const StatsCardContent = styled(CardContent)({
  padding: '24px',
  display: 'flex',
  alignItems: 'center',
  '&:last-child': {
    paddingBottom: '24px',
  },
});

const IconContainer = styled(Box)(({ color }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 64,
  height: 64,
  borderRadius: 16,
  background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
  marginRight: 20,
  '& .MuiSvgIcon-root': {
    color: color,
    fontSize: 32,
  },
}));

const MetricValue = styled(Typography)({
  fontFamily: '"Inter", sans-serif',
  fontSize: '2rem',
  fontWeight: 800,
  color: '#111827',
  letterSpacing: '-0.02em',
  lineHeight: 1,
  marginBottom: 4,
});

const MetricLabel = styled(Typography)({
  fontFamily: '"Inter", sans-serif',
  fontSize: '0.875rem',
  color: '#6b7280',
  fontWeight: 500,
});

const StatusIndicator = styled(Box)(({ status }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 20,
  fontSize: '0.75rem',
  fontWeight: 600,
  fontFamily: '"Inter", sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  background: status === 'online' 
    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    : status === 'warning'
    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  color: 'white',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
}));

const Dashboard = () => {
  const { streams, loading, error } = useStreams();
  const { connected } = useWebSocketContext();
  const [systemHealth, setSystemHealth] = useState({
    cpuUsage: 45,
    memoryUsage: 62,
    storageUsage: 73,
    networkStatus: 'healthy',
    gpuUsage: 38,
  });

  const [recentAlarms] = useState([
    { id: 1, type: 'Motion Detection', camera: 'Main Entrance', time: '2 min ago', severity: 'low' },
    { id: 2, type: 'Unauthorized Access', camera: 'Server Room', time: '15 min ago', severity: 'high' },
    { id: 3, type: 'Object Abandoned', camera: 'Parking Lot', time: '1 hr ago', severity: 'medium' },
  ]);

  // Update system health periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemHealth(prev => ({
        ...prev,
        cpuUsage: Math.max(20, Math.min(80, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(30, Math.min(85, prev.memoryUsage + (Math.random() - 0.5) * 8)),
        gpuUsage: Math.max(20, Math.min(90, prev.gpuUsage + (Math.random() - 0.5) * 15)),
        networkStatus: connected ? 'healthy' : 'disconnected',
      }));
    }, 8000);

    return () => clearInterval(interval);
  }, [connected]);

  if (loading) {
    return (
      <Root>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={40} thickness={4} />
          <Typography variant="body1" sx={{ ml: 2, fontFamily: '"Inter", sans-serif' }}>
            Loading security dashboard...
          </Typography>
        </Box>
      </Root>
    );
  }

  if (error) {
    return (
      <Root>
        <Alert severity="error" sx={{ borderRadius: 2, fontFamily: '"Inter", sans-serif' }}>
          Error loading dashboard: {error}
        </Alert>
      </Root>
    );
  }

  const activeStreams = streams.filter(s => s.status === 'active').length;
  const totalStreams = streams.length;
  const eventsLast24h = 147; // Could be dynamic
  const currentAlarms = recentAlarms.filter(a => a.severity === 'high').length;

  return (
    <Root>
      <PageHeader>
        <Typography className="page-title">
          Security Command Center
        </Typography>
        <Typography className="page-subtitle">
          Real-time monitoring and intelligent surveillance overview
        </Typography>
      </PageHeader>

      <Grid container spacing={3}>
        {/* Key Performance Indicators */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatsCard>
            <StatsCardContent>
              <IconContainer color="#3b82f6">
                <VideocamIcon />
              </IconContainer>
              <Box>
                <MetricValue>{activeStreams}/{totalStreams}</MetricValue>
                <MetricLabel>Active Cameras</MetricLabel>
                <StatusIndicator status="online">● Live Monitoring</StatusIndicator>
              </Box>
            </StatsCardContent>
          </StatsCard>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatsCard>
            <StatsCardContent>
              <IconContainer color="#10b981">
                <EventIcon />
              </IconContainer>
              <Box>
                <MetricValue>{eventsLast24h}</MetricValue>
                <MetricLabel>Events (24h)</MetricLabel>
                <StatusIndicator status="online">● Processing</StatusIndicator>
              </Box>
            </StatsCardContent>
          </StatsCard>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatsCard>
            <StatsCardContent>
              <IconContainer color={currentAlarms > 0 ? "#ef4444" : "#10b981"}>
                <WarningIcon />
              </IconContainer>
              <Box>
                <MetricValue>{currentAlarms}</MetricValue>
                <MetricLabel>Active Alerts</MetricLabel>
                <StatusIndicator status={currentAlarms > 0 ? "warning" : "online"}>
                  ● {currentAlarms > 0 ? 'Attention Required' : 'All Clear'}
                </StatusIndicator>
              </Box>
            </StatsCardContent>
          </StatsCard>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatsCard>
            <StatsCardContent>
              <IconContainer color="#8b5cf6">
                <ShieldIcon />
              </IconContainer>
              <Box>
                <MetricValue>AI</MetricValue>
                <MetricLabel>Vision System</MetricLabel>
                <StatusIndicator status={connected ? "online" : "offline"}>
                  ● {connected ? 'Operational' : 'Disconnected'}
                </StatusIndicator>
              </Box>
            </StatsCardContent>
          </StatsCard>
        </Grid>

        {/* System Performance */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            borderRadius: 2, 
            border: '1px solid #f3f4f6',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#3b82f6', mr: 2 }}>
                  <SpeedIcon />
                </Avatar>
                <Box>
                  <Typography sx={{ 
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: '#111827',
                  }}>
                    System Performance
                  </Typography>
                  <Typography sx={{ 
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}>
                    Real-time resource monitoring
                  </Typography>
                </Box>
              </Box>
              
              {['CPU Usage', 'Memory Usage', 'GPU Usage'].map((metric, index) => {
                const values = [systemHealth.cpuUsage, systemHealth.memoryUsage, systemHealth.gpuUsage];
                const value = values[index];
                return (
                  <Box key={metric} sx={{ mb: index < 2 ? 3 : 0 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography sx={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 500,
                        color: '#374151',
                        fontFamily: '"Inter", sans-serif',
                      }}>
                        {metric}
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 700,
                        color: '#111827',
                        fontFamily: '"Inter", sans-serif',
                      }}>
                        {Math.round(value)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={value}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#f3f4f6',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          background: value > 80 
                            ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                            : value > 60
                            ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                            : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                        },
                      }}
                    />
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Alarms */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            borderRadius: 2, 
            border: '1px solid #f3f4f6',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#ef4444', mr: 2 }}>
                  <WarningIcon />
                </Avatar>
                <Box>
                  <Typography sx={{ 
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: '#111827',
                  }}>
                    Recent Security Alerts
                  </Typography>
                  <Typography sx={{ 
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}>
                    Latest incidents and notifications
                  </Typography>
                </Box>
              </Box>
              
              {recentAlarms.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ fontFamily: '"Inter", sans-serif' }}>
                  No recent alarms
                </Typography>
              ) : (
                <Box>
                  {recentAlarms.map((alarm, index) => (
                    <Box 
                      key={alarm.id}
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        py: 2,
                        borderBottom: index < recentAlarms.length - 1 ? '1px solid #f9fafb' : 'none',
                      }}
                    >
                      <Box>
                        <Typography sx={{ 
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#111827',
                          fontFamily: '"Inter", sans-serif',
                        }}>
                          {alarm.type}
                        </Typography>
                        <Typography sx={{ 
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          fontFamily: '"Inter", sans-serif',
                        }}>
                          {alarm.camera} • {alarm.time}
                        </Typography>
                      </Box>
                      <Chip
                        label={alarm.severity.toUpperCase()}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          fontFamily: '"Inter", sans-serif',
                          letterSpacing: '0.05em',
                          backgroundColor: alarm.severity === 'high' ? '#ef4444' 
                            : alarm.severity === 'medium' ? '#f59e0b' : '#10b981',
                          color: 'white',
                          border: 'none',
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Events Component */}
        <Grid item xs={12}>
          <Card sx={{ 
            borderRadius: 2, 
            border: '1px solid #f3f4f6',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          }}>
            <CardContent sx={{ p: 0 }}>
              <RecentEvents />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Root>
  );
};

export default Dashboard;
