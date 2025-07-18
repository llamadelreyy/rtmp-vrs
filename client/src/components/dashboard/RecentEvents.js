import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Chip, 
  Button, 
  Divider,
  IconButton,
  Collapse
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  LocalFireDepartment as FireIcon,
  Security as IntrusionIcon,
  MedicalServices as MedicalIcon,
  Notifications as NotificationIcon,
  AccessTime as TimeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useRecentEvents } from '../../contexts/RecentEventsContext';
import { formatDistanceToNow } from 'date-fns';

const EventListContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  maxHeight: '400px',
  overflow: 'auto',
  marginBottom: theme.spacing(3)
}));

const EventItem = styled(ListItem)(({ theme, viewed }) => ({
  backgroundColor: viewed ? 'transparent' : theme.palette.action.hover,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
  transition: 'background-color 0.3s',
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  }
}));

const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  cursor: 'pointer'
}));

const getEventIcon = (eventType) => {
  switch(eventType.toLowerCase()) {
    case 'fire':
      return <FireIcon color="error" />;
    case 'intrusion':
      return <IntrusionIcon color="warning" />;
    case 'medical':
      return <MedicalIcon color="info" />;
    default:
      return <NotificationIcon />;
  }
};

const getEventColor = (eventType) => {
  switch(eventType.toLowerCase()) {
    case 'fire':
      return 'error';
    case 'intrusion':
      return 'warning';
    case 'medical':
      return 'info';
    default:
      return 'default';
  }
};

const RecentEvents = () => {
  const { recentEvents, markEventAsViewed } = useRecentEvents();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);

  console.log('RecentEvents component rendering with events:', recentEvents);
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  const handleEventClick = (event) => {
    // Mark the event as viewed
    markEventAsViewed(event.id);
    
    // Ensure streamId is a string
    const streamIdValue = typeof event.streamId === 'object' ? 
      (event.streamId._id || event.streamId.id || JSON.stringify(event.streamId)) : 
      event.streamId;
    
    // Navigate directly to the recording viewer
    navigate(`/recordings/${streamIdValue}?timestamp=${event.detectionTime || event.timestamp}`);
  };
  
  return (
    <EventListContainer>
      <HeaderContainer onClick={toggleExpanded}>
        <Box display="flex" alignItems="center">
          <Typography variant="h6">Recent Events</Typography>
          <IconButton size="small" sx={{ ml: 1 }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        <Chip 
          icon={<TimeIcon />} 
          label={`${recentEvents.length} events`} 
          size="small" 
          color="primary" 
        />
      </HeaderContainer>
      
      <Divider sx={{ mb: 2 }} />
      
      <Collapse in={expanded} timeout="auto">
        {recentEvents.length === 0 ? (
          <Typography variant="body1" color="textSecondary" align="center" sx={{ py: 2 }}>
            No recent events to display
          </Typography>
        ) : (
          <List>
            {recentEvents.map((event) => (
              <EventItem key={event.id} viewed={event.viewed}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: `${getEventColor(event.type)}.main` }}>
                    {getEventIcon(event.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2">
                      {event.type} on {event.streamName}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      {formatDistanceToNow(new Date(event.timestamp))} ago
                    </Typography>
                  }
                />
                <Button 
                  variant="outlined" 
                  size="small" 
                  color={getEventColor(event.type)}
                  onClick={() => handleEventClick(event)}
                >
                  View Footage
                </Button>
              </EventItem>
            ))}
          </List>
        )}
      </Collapse>
    </EventListContainer>
  );
};

export default RecentEvents;
