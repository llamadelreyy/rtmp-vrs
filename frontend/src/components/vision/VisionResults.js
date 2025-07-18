// client/src/components/vision/VisionResults.js
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Pagination,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import { format } from 'date-fns';
import useVisionResults from '../../hooks/useVisionResults';

const VisionResults = ({ streamId, promptId }) => {
  const {
    results,
    loading,
    error,
    totalPages,
    currentPage,
    changePage
  } = useVisionResults(streamId, promptId, true); // Use the built-in pagination

  const handlePageChange = (event, value) => {
    changePage(value);
  };

  if (loading && results.length === 0) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" my={2}>
        Error loading results: {error}
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Vision Analysis Results
      </Typography>

      {results.length === 0 ? (
        <Typography color="textSecondary" my={2}>
          No results available yet. Process some frames to see results here.
        </Typography>
      ) : (
        <>
          <Grid container spacing={3}>
            {results.map((result) => (
              <Grid item xs={12} key={result._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        {result.imageUrl && (
                          <Box
                            component="img"
                            src={`${process.env.REACT_APP_API_URL}${result.imageUrl}`}
                            alt="Captured frame"
                            sx={{
                              width: '100%',
                              maxHeight: 250,
                              objectFit: 'contain',
                              borderRadius: 1
                            }}
                          />
                        )}
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Box>
                            <Typography variant="subtitle2" color="textSecondary">
                              {format(new Date(result.timestamp), 'PPpp')}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={`Prompt: ${result.promptId?.name || "Unknown"}`} 
                              sx={{ mr: 1, mt: 1 }} 
                            />
                            <Chip 
                              size="small" 
                              label={`Processing time: ${result.processingTime}ms`} 
                              sx={{ mt: 1 }} 
                            />
                          </Box>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {result.result}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination 
              count={totalPages} 
              page={currentPage} 
              onChange={handlePageChange} 
              color="primary" 
              showFirstButton 
              showLastButton
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default VisionResults;