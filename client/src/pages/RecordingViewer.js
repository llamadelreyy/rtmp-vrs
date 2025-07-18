import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Button, Container } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import api from '../api/auth';
import HlsStreamViewer from '../components/streams/HlsStreamViewer';
import { format } from 'date-fns';

const RecordingViewer = () => {
  const { streamId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recordingData, setRecordingData] = useState(null);
  const [streamName, setStreamName] = useState('');
  
  // Get timestamp from query params
  const queryParams = new URLSearchParams(location.search);
  const timestamp = queryParams.get('timestamp');
  
  useEffect(() => {
    const fetchRecordingData = async () => {
      try {
        setLoading(true);
        
        // Get stream details to display the name
        const streamResponse = await api.get(`/streams/${streamId}`);
        setStreamName(streamResponse.data.name || streamResponse.data.url);
        
        // Get recording data for the timestamp
        const response = await api.get(`/vision/recording-by-time/${streamId}?timestamp=${timestamp}`);
        
        if (response.data && response.data.recordingFolder) {
          setRecordingData(response.data);
        } else {
          setError('No recording found for this time period');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recording data:', error);
        setError('Failed to load recording. The recording may not exist or has been deleted.');
        setLoading(false);
      }
    };
    
    if (streamId && timestamp) {
      fetchRecordingData();
    } else {
      setError('Missing stream ID or timestamp');
      setLoading(false);
    }
  }, [streamId, timestamp]);
  
  const handleBack = () => {
    navigate(-1);
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, my: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mb: 2 }}>
          Back
        </Button>
        
        <Typography variant="h5" gutterBottom>
          {streamName} - Recording
        </Typography>
        
        {timestamp && (
          <Typography variant="subtitle1" gutterBottom>
            Event Time: {format(new Date(timestamp), 'PPpp')}
          </Typography>
        )}
        
        {error ? (
          <Box mt={3}>
            <Typography color="error" variant="h6">{error}</Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => navigate(`/vision/search`)}
              sx={{ mt: 2 }}
            >
              Go to Search
            </Button>
          </Box>
        ) : recordingData ? (
          <Box mt={3}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              Playing recording from folder: {recordingData.recordingFolder}
            </Typography>
            <HlsStreamViewer
              streamId={streamId}
              recordingFolder={recordingData.recordingFolder}
              isHistorical={true}
            />
          </Box>
        ) : (
          <Typography>No recording available</Typography>
        )}
      </Paper>
    </Container>
  );
};

export default RecordingViewer;
