// client/src/components/vision/QueueStatus.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Chip
} from '@mui/material';
import useVisionQueue from '../../hooks/useVisionQueue';

const QueueStatus = () => {
  const { queueStatus, loading, error, fetchQueueStatus } = useVisionQueue();
  
  useEffect(() => {
    // Initial fetch
    fetchQueueStatus();
    
    // Setup interval to refresh every 5 seconds
    const interval = setInterval(() => {
      fetchQueueStatus();
    }, 5000);
    
    // Cleanup
    return () => clearInterval(interval);
  }, [fetchQueueStatus]);
  
  if (loading && !queueStatus) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" my={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Typography color="error" variant="body2">
        Error loading queue status: {error}
      </Typography>
    );
  }
  
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 1,
        backgroundColor: theme => theme.palette.background.paper
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        Vision Processing Queue
      </Typography>
      
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Chip 
            label={`Waiting: ${queueStatus?.waiting || 0}`}
            color={queueStatus?.waiting > 0 ? "primary" : "default"}
            size="small"
          />
        </Grid>
        <Grid item>
          <Chip 
            label={`Active: ${queueStatus?.active || 0}`}
            color={queueStatus?.active > 0 ? "success" : "default"}
            size="small"
          />
        </Grid>
        <Grid item>
          <Chip 
            label={`Completed: ${queueStatus?.completed || 0}`}
            size="small"
          />
        </Grid>
        <Grid item>
          <Chip 
            label={`Failed: ${queueStatus?.failed || 0}`}
            color={queueStatus?.failed > 0 ? "error" : "default"}
            size="small"
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default QueueStatus;