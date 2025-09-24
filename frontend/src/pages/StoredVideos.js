// frontend/src/pages/StoredVideos.js

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
  DialogActions,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  VideoFile as VideoFileIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import useStreams from '../hooks/useStreams';

const Root = styled('div')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const FilterSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

const VideoGrid = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const VideoCard = styled(Card)(({ theme }) => ({
  height: '280px',
  cursor: 'pointer',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.02)',
  },
  display: 'flex',
  flexDirection: 'column',
}));

const ThumbnailContainer = styled(Box)({
  height: '160px',
  position: 'relative',
  overflow: 'hidden',
});

const VideoActions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  right: 8,
  display: 'flex',
  gap: theme.spacing(1),
}));

const PlayButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: 'rgba(0,0,0,0.7)',
  color: 'white',
  '&:hover': {
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
}));

const VideoPlayer = styled('video')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const PlayerDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    maxWidth: '90vw',
    maxHeight: '90vh',
    width: '90vw',
    height: '80vh',
  },
}));

const StoredVideos = () => {
  const { streams, loading: streamsLoading } = useStreams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCamera, setSelectedCamera] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState({ open: false, video: null, anchorEl: null });

  // Mock video data - replace with actual API calls
  const mockVideos = [
    {
      id: '1',
      streamId: 'stream1',
      streamName: 'Front Door Camera',
      filename: 'front_door_2024_01_15_14_30.mp4',
      date: '2024-01-15',
      time: '14:30:00',
      duration: '01:25:30',
      size: '2.4 GB',
      thumbnail: '/api/thumbnails/video1.jpg',
      url: '/api/videos/video1.mp4'
    },
    {
      id: '2',
      streamId: 'stream2',
      streamName: 'Parking Lot Camera',
      filename: 'parking_lot_2024_01_15_09_15.mp4',
      date: '2024-01-15',
      time: '09:15:00',
      duration: '02:10:45',
      size: '3.8 GB',
      thumbnail: '/api/thumbnails/video2.jpg',
      url: '/api/videos/video2.mp4'
    },
    // Add more mock videos as needed
  ];

  const fetchVideos = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let filteredVideos = mockVideos;
      
      // Filter by date
      const dateStr = selectedDate.toISOString().split('T')[0];
      filteredVideos = filteredVideos.filter(video => video.date === dateStr);
      
      // Filter by camera
      if (selectedCamera !== 'all') {
        filteredVideos = filteredVideos.filter(video => video.streamId === selectedCamera);
      }
      
      // Filter by search term
      if (searchTerm) {
        filteredVideos = filteredVideos.filter(video => 
          video.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
          video.streamName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setVideos(filteredVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [selectedDate, selectedCamera, searchTerm, fetchVideos]);

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setPlayerOpen(true);
  };

  const handleClosePlayer = () => {
    setPlayerOpen(false);
    setSelectedVideo(null);
  };

  const handleActionMenuOpen = (event, video) => {
    event.stopPropagation();
    setActionMenu({
      open: true,
      video,
      anchorEl: event.currentTarget
    });
  };

  const handleActionMenuClose = () => {
    setActionMenu({ open: false, video: null, anchorEl: null });
  };

  const handleDownload = (video) => {
    // Implement download functionality
    const link = document.createElement('a');
    link.href = video.url;
    link.download = video.filename;
    link.click();
    handleActionMenuClose();
  };

  const handleShare = (video) => {
    // Implement share functionality (generate presigned link)
    navigator.clipboard.writeText(`${window.location.origin}${video.url}`);
    handleActionMenuClose();
  };

  const handleDelete = (video) => {
    // Implement delete functionality
    if (window.confirm(`Are you sure you want to delete ${video.filename}?`)) {
      setVideos(videos.filter(v => v.id !== video.id));
    }
    handleActionMenuClose();
  };

  const handleRename = (video) => {
    const newName = prompt('Enter new filename:', video.filename);
    if (newName && newName !== video.filename) {
      setVideos(videos.map(v => 
        v.id === video.id ? { ...v, filename: newName } : v
      ));
    }
    handleActionMenuClose();
  };

  if (streamsLoading) {
    return (
      <Root>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Loading...
          </Typography>
        </Box>
      </Root>
    );
  }

  return (
    <Root>
      <HeaderSection>
        <Typography variant="h4" component="h1" gutterBottom>
          Stored Videos
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Browse and manage daily video recordings from all cameras
        </Typography>
      </HeaderSection>

      <FilterSection>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Select Date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Camera</InputLabel>
                <Select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  label="Camera"
                >
                  <MenuItem value="all">All Cameras</MenuItem>
                  {streams.map((stream) => (
                    <MenuItem key={stream._id} value={stream._id}>
                      {stream.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="textSecondary">
                  {videos.length} video{videos.length !== 1 ? 's' : ''} found
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </FilterSection>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading videos...
            </Typography>
          </Box>
        ) : videos.length === 0 ? (
          <Alert severity="info">
            No videos found for the selected date and filters.
          </Alert>
        ) : (
          <VideoGrid container spacing={3}>
            {videos.map((video) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={video.id}>
                <VideoCard onClick={() => handleVideoClick(video)}>
                  <ThumbnailContainer>
                    <CardMedia
                      component="div"
                      sx={{ 
                        height: '100%',
                        backgroundColor: 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundImage: `url(${video.thumbnail})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <VideoFileIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.7)' }} />
                    </CardMedia>
                    <VideoActions>
                      <PlayButton size="small">
                        <PlayIcon />
                      </PlayButton>
                      <PlayButton 
                        size="small"
                        onClick={(e) => handleActionMenuOpen(e, video)}
                      >
                        <MoreIcon />
                      </PlayButton>
                    </VideoActions>
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        borderRadius: 1,
                        px: 1,
                        py: 0.5
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'white' }}>
                        {video.duration}
                      </Typography>
                    </Box>
                  </ThumbnailContainer>
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom noWrap>
                      {video.filename}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {video.streamName}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="textSecondary">
                        {video.time}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {video.size}
                      </Typography>
                    </Box>
                  </CardContent>
                </VideoCard>
              </Grid>
            ))}
          </VideoGrid>
        )}

        {/* Video Player Dialog */}
        <PlayerDialog
          open={playerOpen}
          onClose={handleClosePlayer}
          maxWidth={false}
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                {selectedVideo?.filename}
              </Typography>
              <IconButton onClick={handleClosePlayer}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {selectedVideo && (
              <VideoPlayer
                src={selectedVideo.url}
                controls
                autoPlay
                onError={(e) => console.error('Video playback error:', e)}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button startIcon={<DownloadIcon />} onClick={() => handleDownload(selectedVideo)}>
              Download
            </Button>
            <Button startIcon={<ShareIcon />} onClick={() => handleShare(selectedVideo)}>
              Share
            </Button>
          </DialogActions>
        </PlayerDialog>

        {/* Action Menu */}
        <Menu
          open={actionMenu.open}
          onClose={handleActionMenuClose}
          anchorEl={actionMenu.anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={() => handleRename(actionMenu.video)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleDownload(actionMenu.video)}>
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleShare(actionMenu.video)}>
            <ListItemIcon>
              <ShareIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Share</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleDelete(actionMenu.video)} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>
      </Root>
    );
};

export default StoredVideos;