// frontend/src/pages/LiveDescriptions.js

import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  VideoCall as VideoCallIcon
} from '@mui/icons-material';
import useStreams from '../hooks/useStreams';
import StreamPlayer from '../components/streams/StreamPlayer';
import { useWebSocketContext } from '../contexts/WebSocketContext';

const Root = styled('div')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: theme.spacing(2),
  },
}));

const CameraGrid = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const CameraTile = styled(Card)(({ theme }) => ({
  height: '300px',
  cursor: 'pointer',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.02)',
  },
  display: 'flex',
  flexDirection: 'column',
}));

const ThumbnailContainer = styled(Box)({
  height: '200px',
  position: 'relative',
  overflow: 'hidden',
});

const CaptionsContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(1),
  overflow: 'hidden',
}));

const CaptionItem = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  marginBottom: theme.spacing(0.5),
  color: theme.palette.text.secondary,
}));

const SplitViewDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    maxWidth: '95vw',
    maxHeight: '95vh',
    width: '95vw',
    height: '95vh',
  },
}));

const SplitViewContent = styled(Box)({
  display: 'flex',
  height: '100%',
  minHeight: '70vh',
});

const VideoSection = styled(Box)({
  flex: '1 1 60%',
  display: 'flex',
  flexDirection: 'column',
});

const CaptionsSection = styled(Box)(({ theme }) => ({
  flex: '1 1 40%',
  borderLeft: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
  overflow: 'auto',
}));

const AddCameraCard = styled(Card)(({ theme }) => ({
  height: '300px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  border: `2px dashed ${theme.palette.divider}`,
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

const LiveDescriptions = () => {
  const { streams, loading, error } = useStreams();
  const { connected } = useWebSocketContext();
  const [selectedStream, setSelectedStream] = useState(null);
  const [realtimeCaptions, setRealtimeCaptions] = useState({});
  const [streamThumbnails, setStreamThumbnails] = useState({});

  // Real-time vision processing for live descriptions
  useEffect(() => {
    if (!connected || !streams.length) return;

    const generateLiveDescription = async (stream) => {
      try {
        const timestamp = new Date().toLocaleTimeString();
        
        // Call the vision API to process a frame from the stream
        const response = await fetch(`/api/vision/generate-live-description/${stream._id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            prompt: `Describe what you see in this image in detail. Provide a natural, comprehensive description that includes:

- The setting and environment (indoor/outdoor, type of location, lighting, weather)
- All people visible (number, what they're wearing, what they're doing, their movements and interactions)
- Objects, vehicles, and equipment present (describe colors, types, positions)
- Any activities or events taking place
- The overall atmosphere and any notable details

Be descriptive and specific, as if you're explaining the scene to someone who can't see it. Focus on what is actually visible rather than making assumptions.

Respond with only a detailed text description of the scene.`
          })
        });

        if (response.ok) {
          const result = await response.json();
          const description = result.description || result.content || 'No description available';
          
          setRealtimeCaptions(prev => ({
            ...prev,
            [stream._id]: [
              `${timestamp}: ${description}`,
              ...(prev[stream._id] || []).slice(0, 4) // Keep last 5 captions
            ]
          }));
        } else {
          console.error(`Failed to get description for stream ${stream._id}:`, response.statusText);
          setRealtimeCaptions(prev => ({
            ...prev,
            [stream._id]: [
              `${timestamp}: Unable to analyze frame - ${response.statusText}`,
              ...(prev[stream._id] || []).slice(0, 4)
            ]
          }));
        }
      } catch (error) {
        console.error(`Error generating description for stream ${stream._id}:`, error);
        const timestamp = new Date().toLocaleTimeString();
        setRealtimeCaptions(prev => ({
          ...prev,
          [stream._id]: [
            `${timestamp}: Analysis temporarily unavailable`,
            ...(prev[stream._id] || []).slice(0, 4)
          ]
        }));
      }
    };

    // Process descriptions for active streams
    const interval = setInterval(() => {
      const activeStreams = streams.filter(s => s.status === 'active');
      activeStreams.forEach(stream => {
        generateLiveDescription(stream);
      });
    }, 5000); // Generate new descriptions every 5 seconds

    return () => clearInterval(interval);
  }, [streams, connected]);

  const handleTileClick = (stream) => {
    setSelectedStream(stream);
  };

  const handleCloseSplitView = () => {
    setSelectedStream(null);
  };

  const handleAddCamera = () => {
    // Navigate to add stream page or open dialog
    window.location.href = '/streams';
  };

  const activeStreams = streams.filter(s => s.status === 'active');

  if (loading) {
    return (
      <Root>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Loading cameras...
          </Typography>
        </Box>
      </Root>
    );
  }

  if (error) {
    return (
      <Root>
        <Alert severity="error">
          Error loading cameras: {error}
        </Alert>
      </Root>
    );
  }

  return (
    <Root>
      <HeaderSection>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Live Descriptions
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Real-time AI-generated descriptions for all active cameras
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip 
            label={connected ? "Live" : "Disconnected"} 
            color={connected ? "success" : "error"} 
            variant="outlined"
          />
          <Typography variant="body2" color="textSecondary">
            {activeStreams.length} active camera{activeStreams.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </HeaderSection>

      <CameraGrid container spacing={3}>
        {activeStreams.map((stream) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={stream._id}>
            <CameraTile onClick={() => handleTileClick(stream)}>
              <ThumbnailContainer>
                <CardMedia
                  component="div"
                  sx={{ 
                    height: '100%',
                    backgroundColor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <StreamPlayer 
                    stream={stream} 
                    height="200px"
                    muted
                    controls={false}
                  />
                </CardMedia>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    borderRadius: 1,
                    p: 0.5
                  }}
                >
                  <VideoCallIcon sx={{ color: 'success.main', fontSize: 16 }} />
                </Box>
              </ThumbnailContainer>
              <CardContent sx={{ flexGrow: 1, p: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {stream.name}
                </Typography>
                <CaptionsContainer>
                  {(realtimeCaptions[stream._id] || ['Waiting for AI analysis...']).map((caption, index) => (
                    <CaptionItem key={index}>
                      {caption}
                    </CaptionItem>
                  ))}
                </CaptionsContainer>
              </CardContent>
            </CameraTile>
          </Grid>
        ))}
        
        {/* Add Camera Tile */}
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <AddCameraCard onClick={handleAddCamera}>
            <AddIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              Add Camera
            </Typography>
            <Typography variant="body2" color="textSecondary" textAlign="center">
              Register new RTSP feeds
            </Typography>
          </AddCameraCard>
        </Grid>
      </CameraGrid>

      {/* Split View Dialog */}
      <SplitViewDialog
        open={!!selectedStream}
        onClose={handleCloseSplitView}
        maxWidth={false}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedStream?.name} - Live View
            </Typography>
            <IconButton onClick={handleCloseSplitView}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <SplitViewContent>
            <VideoSection>
              {selectedStream && (
                <StreamPlayer 
                  stream={selectedStream} 
                  fullWidth
                  height="100%"
                  controls={true}
                />
              )}
            </VideoSection>
            <CaptionsSection>
              <Typography variant="h6" gutterBottom>
                Real-time Analysis
              </Typography>
              <Box>
                {(realtimeCaptions[selectedStream?._id] || []).map((caption, index) => (
                  <Box key={index} sx={{ mb: 2, p: 1, backgroundColor: 'background.paper', borderRadius: 1 }}>
                    <Typography variant="body2">
                      {caption}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CaptionsSection>
          </SplitViewContent>
        </DialogContent>
      </SplitViewDialog>
    </Root>
  );
};

export default LiveDescriptions;