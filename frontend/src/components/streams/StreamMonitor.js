// client/src/components/streams/StreamMonitor.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button,
  FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Paper, Alert, Snackbar, Breadcrumbs, Link as MuiLink,
  IconButton, Tooltip
} from '@mui/material';
import {
  Photo as PhotoIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useVisionResults from '../../hooks/useVisionResults';
import { useStreamContext } from '../../contexts/StreamContext';
import QueueStatus from '../vision/QueueStatus';
import VisionResults from '../vision/VisionResults';
import StreamPlayer from './StreamPlayer';
import useStreamPrompts from '../../hooks/useStreamPrompts';
import useAuth from '../../hooks/useAuth';
import StreamDetailsDialog from './StreamDetailsDialog';

// New component for Stream Analysis Controls
const StreamAnalysisControls = ({ 
  prompts, 
  promptsLoading, 
  selectedPromptId, 
  onPromptChange, 
  onProcessFrame, 
  processingFrame, 
  processingCooldown 
}) => (
  <Grid container spacing={2} alignItems="center">
    <Grid item xs={12} md={6}>
      <FormControl fullWidth>
        <InputLabel>Analysis Prompt</InputLabel>
        <Select
          value={selectedPromptId}
          onChange={onPromptChange}
          label="Analysis Prompt"
          disabled={promptsLoading || prompts.length === 0}
        >
          {promptsLoading ? (
            <MenuItem value="">Loading prompts...</MenuItem>
          ) : prompts.length === 0 ? (
            <MenuItem value="">No prompts available</MenuItem>
          ) : (
            prompts.map(prompt => (
              <MenuItem key={prompt._id} value={prompt._id}>
                {prompt.name}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>
    </Grid>
    <Grid item xs={12} md={6}>
      <Button
        variant="contained"
        color="primary"
        startIcon={processingFrame ? <CircularProgress size={20} color="inherit" /> : <PhotoIcon />}
        onClick={onProcessFrame}
        disabled={processingFrame || processingCooldown || !selectedPromptId || prompts.length === 0}
        fullWidth
      >
        {processingFrame ? 'Processing...' : processingCooldown ? 'Cooldown...' : 'Process Current Frame'}
      </Button>
    </Grid>
  </Grid>
);

// New component for StreamPlayerSection
const StreamPlayerSection = ({ 
  stream, 
  prompts, 
  promptsLoading, 
  selectedPromptId, 
  handlePromptChange, 
  handleProcessFrame,
  processingFrame, 
  processingCooldown,
  onRefresh,
  isRefreshing
}) => (
  <Card variant="outlined">
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">
          Live Stream
        </Typography>
        <Tooltip title="Refresh stream data">
          <IconButton 
            onClick={onRefresh} 
            disabled={isRefreshing}
            size="small"
          >
            {isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      
      <Box 
        sx={{ 
          bgcolor: 'black', 
          height: 400, 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          mb: 2,
          overflow: 'hidden'
        }}
      >
        <StreamPlayer stream={stream} key={`player-${stream._id}-${stream.updatedAt || Date.now()}`} />
      </Box>
      
      <StreamAnalysisControls
        prompts={prompts}
        promptsLoading={promptsLoading}
        selectedPromptId={selectedPromptId}
        onPromptChange={handlePromptChange}
        onProcessFrame={handleProcessFrame}
        processingFrame={processingFrame}
        processingCooldown={processingCooldown}
      />
    </CardContent>
  </Card>
);

// Main component
const StreamMonitor = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { streams, fetchStreams } = useStreamContext();
  const { prompts, loading: promptsLoading, fetchPrompts } = useStreamPrompts(streamId);
  const { isOperator } = useAuth();
  
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [processingCooldown, setProcessingCooldown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [initialTab, setInitialTab] = useState(0);

  const [resultsRefreshKey, setResultsRefreshKey] = useState(0);
  
  
  const { processFrame, loading: processingFrame } = useVisionResults(streamId, selectedPromptId);
  
  // Find current stream
  const stream = streams.find(s => s._id === streamId);
  
  // Set the first prompt as selected when prompts are loaded
  useEffect(() => {
    if (prompts.length > 0 && !selectedPromptId) {
      setSelectedPromptId(prompts[0]._id);
    }
  }, [prompts, selectedPromptId]);
  
  // Show notification when no prompts are available
  useEffect(() => {
    if (!promptsLoading && prompts.length === 0) {
      setSnackbar({
        open: true,
        message: isOperator() 
          ? 'No analysis prompts available. Please create a prompt to analyze this stream.' 
          : 'No analysis prompts available for this stream. Please contact an operator to add prompts.',
        severity: 'info'
      });
    }
  }, [promptsLoading, prompts.length, isOperator]);

  // Refresh stream data
  const refreshStreamData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // Fetch fresh stream data
      await fetchStreams();
      
      // Also refresh prompts
      await fetchPrompts();
      
      setSnackbar({
        open: true,
        message: 'Stream data refreshed successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error refreshing stream data:', error);
      setSnackbar({
        open: true,
        message: `Failed to refresh: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchStreams, fetchPrompts]);
  
  const handlePromptChange = (event) => {
    setSelectedPromptId(event.target.value);
  };
  
  const handleProcessFrame = async () => {
    if (!selectedPromptId) {
      setSnackbar({
        open: true,
        message: 'Please select a prompt first',
        severity: 'warning'
      });
      return;
    }
    
    try {
      setProcessingCooldown(true);
      
      await processFrame(selectedPromptId);
      
      // After successfully processing the frame, update the refresh key
      // to force the VisionResults component to refresh
      setResultsRefreshKey(prev => prev + 1);
      
      setSnackbar({
        open: true,
        message: 'Frame processed successfully',
        severity: 'success'
      });
      
      // Cooldown timer
      setTimeout(() => {
        setProcessingCooldown(false);
      }, 10000); // 10 seconds cooldown
    } catch (error) {
      console.error('Process frame error:', error);
      
      // Improved error handling with more specific messages
      const errorMessage = error.response?.status === 429 
        ? 'Processing on cooldown or no significant change detected'
        : error.response?.data?.message || error.message || 'Unknown error occurred';
      
      setSnackbar({
        open: true,
        message: `Error: ${errorMessage}`,
        severity: error.response?.status === 429 ? 'info' : 'error'
      });
      
      // Shorter cooldown for errors
      setTimeout(() => {
        setProcessingCooldown(false);
      }, 3000);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  const handleNavigateToStreams = () => {
    navigate('/streams');
  };
  
  const handleAddPrompt = () => {
    // Set the initial tab to the "Custom Prompts" tab (index 2)
    setInitialTab(2); 
    // Open the StreamDetailsDialog
    setDetailsDialogOpen(true);
  };

    // Function to close the details dialog
  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    // Reset initial tab for next time
    setInitialTab(0);
  };
  
  // Function for edit stream that will be passed to the dialog
  const handleEditStream = (stream) => {
    // Implementation will depend on your app's requirements
    console.log("Edit stream functionality would go here", stream);
  };
  
  // Function for toggling stream status
  const handleToggleStreamStatus = (stream) => {
    // Implementation will depend on your app's requirements
    console.log("Toggle stream status functionality would go here", stream);
  };
  
  if (!stream) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Stream not found
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={refreshStreamData}
            startIcon={isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
            disabled={isRefreshing}
            sx={{ mr: 2 }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Stream Data'}
          </Button>
          
          <Button 
            variant="outlined" 
            startIcon={<ArrowBackIcon />}
            onClick={handleNavigateToStreams}
          >
            Back to Streams
          </Button>
        </Box>
        
        <Typography variant="body2" color="textSecondary">
          The requested stream may have been deleted or you may not have access to it.
          Try refreshing the data or returning to the streams list.
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <MuiLink component={Link} to="/dashboard" color="inherit">
          Dashboard
        </MuiLink>
        <MuiLink component={Link} to="/streams" color="inherit">
          Streams
        </MuiLink>
        <Typography color="textPrimary">{stream.name}</Typography>
      </Breadcrumbs>
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          {stream.name} - Monitor
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={handleNavigateToStreams}
        >
          Back to Streams
        </Button>
      </Box>
      
      {!promptsLoading && prompts.length === 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            isOperator() && (
              <Button 
                color="inherit" 
                size="small" 
                startIcon={<AddIcon />}
                onClick={handleAddPrompt}
              >
                Create Prompt
              </Button>
            )
          }
        >
          {isOperator() 
            ? 'No analysis prompts are available for this stream. Create a prompt to analyze stream content.' 
            : 'No analysis prompts are available for this stream. Please contact an operator to add prompts.'}
        </Alert>
      )}
      <StreamDetailsDialog
        open={detailsDialogOpen}
        onClose={handleCloseDetailsDialog}
        stream={stream}
        isOperator={isOperator()}
        onEdit={handleEditStream}
        onNavigateToMonitor={() => {}} // Already on monitor page
        onToggleStatus={handleToggleStreamStatus}
        initialTab={initialTab} // Pass the initial tab index
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <StreamPlayerSection 
            stream={stream}
            prompts={prompts}
            promptsLoading={promptsLoading}
            selectedPromptId={selectedPromptId}
            handlePromptChange={handlePromptChange}
            handleProcessFrame={handleProcessFrame}
            processingFrame={processingFrame}
            processingCooldown={processingCooldown}
            onRefresh={refreshStreamData}
            isRefreshing={isRefreshing}
          />
          
          <Box mt={3}>
            <QueueStatus />
          </Box>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <VisionResults 
            streamId={streamId} 
            promptId={selectedPromptId} 
            key={`vision-results-${resultsRefreshKey}-${selectedPromptId}`} 
          />
        </Grid>
      </Grid>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StreamMonitor;