// client/src/pages/Dashboard.js

import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { IconButton, useMediaQuery, useTheme } from '@mui/material';
import {
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Drawer,
  Chip,
} from '@mui/material';
import {
  FullscreenExit as FullscreenExitOutlined,
  Fullscreen as FullscreenOutlined,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import StreamPlayer from '../components/streams/StreamPlayer';
import useStreams from '../hooks/useStreams';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { calculateOptimalLayout } from '../utils/layoutCalculator';
import StreamGroups from '../components/streams/StreamGroups';
import StreamEventOptions from '../components/dashboard/StreamEventOptions';
import RecentEvents from '../components/dashboard/RecentEvents';

// Make the grid responsive
const ResponsiveGridLayout = WidthProvider(Responsive);

// Styled components with responsive considerations
const Root = styled('div')({
  flexGrow: 1,
});

const GridContainer = styled('div')({
  minHeight: 'calc(100vh - 200px)',
});

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
}));

const StreamTitle = styled('div')(({ theme }) => ({
  marginBottom: theme.spacing(1),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
  },
}));

const FullscreenContainer = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'black',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
});

const FullscreenHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1),
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
}));

const FullscreenTitle = styled(Typography)({
  color: 'white',
});

const FullscreenPlayer = styled('div')({
  flexGrow: 1,
});

// Responsive control container
const ControlsContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

const SearchContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flexGrow: 1,
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

const QuickAccessContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  flexWrap: 'wrap',
  [theme.breakpoints.down('sm')]: {
    justifyContent: 'center',
  },
}));

const HeaderContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: theme.spacing(1),
  },
}));

const NoStreamsMessage = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
}));

const LoadingContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
});

const PaginationContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginTop: theme.spacing(2),
  gap: theme.spacing(2),
}));

const MobileStreamCard = styled(Paper)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
}));

const Dashboard = () => {
  const { streams: allStreams, loading, error } = useStreams();
  const { connected } = useWebSocketContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Remove layout since it's unused
  const [currentLayout, setCurrentLayout] = useState([]);
  const [fullscreenStream, setFullscreenStream] = useState(null);
  const [activeStreams, setActiveStreams] = useState(allStreams);

  const [activeGroup, setActiveGroup] = useState('all');
  const [page, setPage] = useState(0);
  const [streamsPerPage] = useState(12);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [eventStreams, setEventStreams] = useState({
    fire: [],
    intrusion: [],
    medical: [],
  });
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filterStreamsByEventHandler = (event) => {
    // Check if there are active detections for this event
    const hasActiveDetections = eventStreams[event]?.length > 0;

    // If clicking the same event that's already selected
    if (selectedEvent === event) {
      // Only deselect if there are no active detections
      if (!hasActiveDetections) {
        setSelectedEvent(null);
      }
      // Otherwise keep the same filter (do nothing)
    } else {
      // Select the new event
      setSelectedEvent(event);
    }

    // Reset to page 0 when changing filters
    setPage(0);
  };

  const streamsFilterRemoveHandler = () => {
    setSelectedEvent(null);
  };

  // Layout presets - adjust for screen size
  useEffect(() => {
    if (allStreams.length === 0) {
      return;
    }

    let filteredStreams = allStreams.filter((s) => s.status === 'active');

    // Then filter by selected event if any
    if (selectedEvent && eventStreams[selectedEvent]?.length > 0) {
      filteredStreams = filteredStreams.filter((s) =>
        eventStreams[selectedEvent].includes(s._id)
      );
    }

    if (selectedEvent && eventStreams[selectedEvent]?.length === 0) {
      filteredStreams = [];
    }

    // First filter by group/category
    if (activeGroup !== 'all') {
      filteredStreams = filteredStreams.filter(
        (s) => s.category === activeGroup
      );
    }

    // Adjust streams per page for smaller screens
    const effectiveStreamsPerPage = isMobile
      ? 4
      : isTablet
      ? 8
      : streamsPerPage;

    const paginatedStreams = filteredStreams.slice(
      page * effectiveStreamsPerPage,
      (page + 1) * effectiveStreamsPerPage
    );

    // Only calculate grid layout for non-mobile screens
    if (!isMobile) {
      const containerWidth = window.innerWidth - 48; // Account for padding
      const containerHeight = window.innerHeight - 200; // Account for header

      const newLayout = calculateOptimalLayout(
        paginatedStreams,
        containerWidth,
        containerHeight
      );

      setCurrentLayout(newLayout);
    }

    setActiveStreams(paginatedStreams);
  }, [
    allStreams,
    activeGroup,
    page,
    streamsPerPage,
    isMobile,
    isTablet,
    selectedEvent,
  ]);

  // Enter fullscreen for a stream
  const handleFullscreen = (stream) => {
    setFullscreenStream(stream);
  };

  // Exit fullscreen
  const handleExitFullscreen = () => {
    setFullscreenStream(null);
  };

  // Toggle mobile drawer
  const toggleMobileDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress />
        <Typography variant="body1" sx={{ marginLeft: 2 }}>
          Loading streams...
        </Typography>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <NoStreamsMessage>
        <Typography variant="h6" color="error">
          Error: {error}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.location.reload()}
          sx={{ marginTop: 2 }}
        >
          Retry
        </Button>
      </NoStreamsMessage>
    );
  }

  // Render fullscreen view
  if (fullscreenStream) {
    return (
      <FullscreenContainer>
        <FullscreenHeader>
          <FullscreenTitle variant="h6">
            {fullscreenStream.name}
          </FullscreenTitle>
          <Button
            variant="text"
            color="inherit"
            startIcon={<FullscreenExitOutlined />}
            onClick={handleExitFullscreen}
          >
            Exit Fullscreen
          </Button>
        </FullscreenHeader>
        <FullscreenPlayer>
          <StreamPlayer stream={fullscreenStream} fullscreen={true} />
        </FullscreenPlayer>
      </FullscreenContainer>
    );
  }

  // Mobile navigation drawer
  const mobileDrawer = (
    <Drawer
      anchor="left"
      open={mobileDrawerOpen}
      onClose={() => setMobileDrawerOpen(false)}
    >
      <Box sx={{ width: 250, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Realtime Dashboard
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Recent Events
          </Typography>
          <RecentEvents />
        </Box> 

        {allStreams.length > 0 && (
          <StreamGroups
            streams={allStreams}
            activeGroup={activeGroup}
            onGroupChange={(_, newValue) => {
              setActiveGroup(newValue);
              setPage(0);
              setMobileDrawerOpen(false);
            }}
            orientation="vertical"
          />
        )}
      </Box>
    </Drawer>
  );

  // Render different layouts based on screen size
  const renderStreams = () => {
    if (allStreams.length === 0) {
      return (
        <NoStreamsMessage>
          <Typography variant="h6">No streams available</Typography>
          <Typography variant="body1" color="textSecondary">
            Add streams in the Stream Management section to get started.
          </Typography>
        </NoStreamsMessage>
      );
    }

    if (currentLayout.length === 0) {
      return (
        <NoStreamsMessage>
          {selectedEvent && eventStreams[selectedEvent]?.length === 0 ? (
            <>
              <Typography variant="h6">No active detection</Typography>
              <Typography variant="body1" color="textSecondary">
                There are currently no streams with active {selectedEvent}{' '}
                detections.
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h6">No active streams</Typography>
              <Typography variant="body1" color="textSecondary">
                There are no active streams at the moment. Please check the
                stream status in the Stream Management section.
              </Typography>
            </>
          )}
        </NoStreamsMessage>
      );
    }

    if (activeStreams.length === 1) {
      return (
        <Box sx={{ height: 'calc(100vh - 250px)' }}>
          <StyledPaper>
            <StreamTitle>
              <Typography variant="subtitle1">
                {activeStreams[0].name}
              </Typography>
              <Button
                size="small"
                onClick={() => handleFullscreen(activeStreams[0])}
                startIcon={<FullscreenOutlined />}
              >
                Fullscreen
              </Button>
            </StreamTitle>
            <StreamPlayer 
              stream={activeStreams[0]} 
              fullWidth 
              height="100%"
              hasActiveDetection={
                selectedEvent 
                  ? eventStreams[selectedEvent]?.includes(activeStreams[0]._id)
                  : Object.keys(eventStreams).some(eventType => 
                      eventStreams[eventType]?.includes(activeStreams[0]._id)
                    )
              }
            />
          </StyledPaper>
        </Box>
      );
    }

    // Mobile-specific stream view
    if (isMobile) {
      return (
        <Box>
          {activeStreams.map((stream) => (
            <MobileStreamCard key={stream.id}>
              <StreamTitle>
                <Typography variant="subtitle1">{stream.name}</Typography>
                <Button
                  size="small"
                  onClick={() => handleFullscreen(stream)}
                  startIcon={<FullscreenOutlined />}
                >
                  Fullscreen
                </Button>
              </StreamTitle>
              <Box sx={{ height: '200px' }}>
                <StreamPlayer 
                  stream={stream}
                  hasActiveDetection={
                    selectedEvent 
                      ? eventStreams[selectedEvent]?.includes(stream._id)
                      : Object.keys(eventStreams).some(eventType => 
                          eventStreams[eventType]?.includes(stream._id)
                        )
                  }

                />
              </Box>
            </MobileStreamCard>
          ))}
        </Box>
      );
    }

    // Desktop/tablet grid layout
    return (
      <ResponsiveGridLayout
        className={GridContainer.toString()}
        layouts={{ lg: currentLayout, md: currentLayout, sm: currentLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 12, sm: 12 }}
        rowHeight={30}
        isDraggable
        isResizable
      >
        {currentLayout.map((item) => (
          <div key={item.i}>
            <StyledPaper>
              {item.stream ? (
                <>
                  <StreamTitle>
                    <Typography variant="subtitle1">
                      {item.stream.name}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => handleFullscreen(item.stream)}
                      startIcon={<FullscreenOutlined />}
                    >
                      Fullscreen
                    </Button>
                  </StreamTitle>
                  <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    <StreamPlayer 
                      stream={item.stream}
                      hasActiveDetection={
                        selectedEvent 
                          ? eventStreams[selectedEvent]?.includes(item.stream._id)
                          : Object.keys(eventStreams).some(eventType => 
                              eventStreams[eventType]?.includes(item.stream._id)
                            )
                      }
                    />
                  </Box>
                </>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    No stream assigned
                  </Typography>
                </Box>
              )}
            </StyledPaper>
          </div>
        ))}
      </ResponsiveGridLayout>
    );
  };

  return (
    <Root>
      {/* Mobile drawer for navigation on small screens */}
      {mobileDrawer}

      <ControlsContainer>
        {/* Mobile menu button */}
        {isMobile && (
          <IconButton edge="start" color="inherit" onClick={toggleMobileDrawer}>
            <MenuIcon />
          </IconButton>
        )}

        <HeaderContainer>
          <Typography variant="h5" component="h1">
            Realtime Dashboard
          </Typography>
          {connected ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="success.main">
                Real-time updates:
              </Typography>
              <Chip label="Connected" color="success" size="small" />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="error.main">
                Real-time updates:
              </Typography>
              <Chip label="Disconnected" color="error" size="small" />
            </Box>
          )}
        </HeaderContainer>

        {/* Hide quick access buttons on mobile - they're in the drawer */}
        {!isMobile && (
          <QuickAccessContainer>
            <StreamEventOptions
              streams={activeStreams}
              onButtonClick={filterStreamsByEventHandler}
              onRemoveFilter={() => {
                setSelectedEvent(null);
                streamsFilterRemoveHandler();
              }}
              onEventStreamsChange={setEventStreams}
              selectedEvent={selectedEvent}
            />
          </QuickAccessContainer>
        )}
      </ControlsContainer>

      {!isMobile && (
        <Box sx={{ mb: 3 }}>
          <RecentEvents />
        </Box>
      )}

      {/* Show tabs if not mobile and streams exist */}
      {!isMobile && allStreams.length > 0 && (
        <StreamGroups
          streams={allStreams}
          activeGroup={activeGroup}
          onGroupChange={(_, newValue) => {
            setActiveGroup(newValue);
            setPage(0);
          }}
        />
      )}

      {renderStreams()}

      {/* Responsive pagination controls */}
      {allStreams.length > streamsPerPage && (
        <PaginationContainer>
          <Button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            variant={isMobile ? 'contained' : 'text'}
            size={isMobile ? 'small' : 'medium'}
          >
            Previous
          </Button>
          {!isMobile && (
            <Typography variant="body2" sx={{ alignSelf: 'center' }}>
              Page {page + 1}
            </Typography>
          )}
          <Button
            disabled={(page + 1) * streamsPerPage >= allStreams.length}
            onClick={() => setPage((p) => p + 1)}
            variant={isMobile ? 'contained' : 'text'}
            size={isMobile ? 'small' : 'medium'}
          >
            Next
          </Button>
        </PaginationContainer>
      )}
    </Root>
  );
};

export default Dashboard;
