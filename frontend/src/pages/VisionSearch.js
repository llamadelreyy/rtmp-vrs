// client/src/pages/VisionSearch.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Pagination,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  FormLabel,
  Stack,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';
import useVisionResults from '../hooks/useVisionResults';
import useStreams from '../hooks/useStreams';
import useSearchFilters from '../hooks/useSearchFilters';
import SearchFilters from '../components/search/SearchFilters';
import ResultItem from '../components/search/ResultItem';
import { useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const VisionSearch = () => {
  const location = useLocation();
  console.log('VisionSearch location state:', location.state);

  const [page, setPage] = useState(1);
  const [searchResults, setSearchResults] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();
  
  // Use the custom hooks
  const { searchResults: performSearch } = useVisionResults();
  const { streams, loading: streamsLoading } = useStreams();
  const {
    filters,
    datePreset,
    updateFilters,
    updateFilter,
    clearFilters,
    applyDatePreset
  } = useSearchFilters(location.state?.searchFilters || {});
  
  // Function to combine date and time
  const combineDateAndTime = (date, time) => {
    if (!date) return null;
    
    const dateObj = new Date(date);
    
    if (time) {
      const timeObj = dayjs(time);
      dateObj.setHours(timeObj.hour());
      dateObj.setMinutes(timeObj.minute());
      dateObj.setSeconds(timeObj.second());
    }
    
    return dateObj.toISOString();
  };
  
  const handleSearch = useCallback(async () => {
    if (!isAuthenticated()) return;

    try {
      setSearching(true);
      setError(null);
      
      // Combine date and time for search
      const fromDateTime = combineDateAndTime(filters.fromDate, filters.fromTime);
      const toDateTime = combineDateAndTime(filters.toDate, filters.toTime);
      
      const results = await performSearch(filters.query, {
        streamId: filters.streamId || undefined,
        fromDate: fromDateTime,
        toDate: toDateTime,
        page,
        limit: 10,
        prioritize: 'relevant', // Or 'recent'
        useEmbedding: true,
        similarity: 0.01
      });

      // After search in VisionSearch.js:
      console.log('Search method used:', results.searchMethod);
      console.log('Average similarity:', results.averageSimilarity);
      
      setSearchResults(results.results);
      setTotalPages(results.totalPages || 1);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to perform search. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [performSearch, filters, page, isAuthenticated]);
  
  const handleFilterChange = (newFilters) => {
    updateFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };
  
  const handleTimeChange = (type, newValue) => {
    updateFilter(type, newValue);
  };
  
  const handleClear = () => {
    clearFilters();
    setSearchResults([]);
    setHasSearched(false);
    setError(null);
  };
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleDatePresetChange = (event, newPreset) => {
    if (newPreset !== null) {
      applyDatePreset(newPreset);
    }
  };
  
  // Add this effect to handle initial search when filters are pre-populated
  useEffect(() => {
    if (location.state?.searchFilters && isAuthenticated()) {
      console.log('Found search filters in navigation state, performing search');
      // If we have pre-populated filters, perform search automatically
      handleSearch();
    }
  }, [isAuthenticated]);  // Add isAuthenticated as a dependency

  // Perform search when page changes and we have already searched once
  useEffect(() => {
    if (hasSearched && isAuthenticated()) {
      handleSearch();
    }
  }, [page, hasSearched, handleSearch, isAuthenticated]);
 
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
          Vision Results Search
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <SearchFilters 
            filters={filters}
            onFilterChange={handleFilterChange}
            streams={streams}
            streamsLoading={streamsLoading}
          />
          
          {/* Time Selection Controls */}
          <Box mt={3}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">Time Range</FormLabel>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                mt={1}
                alignItems="center"
              >
                <TimePicker
                  label="From Time"
                  value={filters.fromTime ? dayjs(filters.fromTime) : null}
                  onChange={(newValue) => handleTimeChange('fromTime', newValue)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  disabled={!filters.fromDate}
                />
                <TimePicker
                  label="To Time"
                  value={filters.toTime ? dayjs(filters.toTime) : null}
                  onChange={(newValue) => handleTimeChange('toTime', newValue)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  disabled={!filters.toDate}
                />
              </Stack>
            </FormControl>
          </Box>
          
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Date Filters:
            </Typography>
            <ToggleButtonGroup
              value={datePreset}
              exclusive
              onChange={handleDatePresetChange}
              aria-label="date presets"
              size="small"
              sx={{ mb: 2 }}
            >
              <ToggleButton value="today" aria-label="today">
                Today
              </ToggleButton>
              <ToggleButton value="yesterday" aria-label="yesterday">
                Yesterday
              </ToggleButton>
              <ToggleButton value="last3Days" aria-label="last 3 days">
                Last 3 Days
              </ToggleButton>
              <ToggleButton value="last7Days" aria-label="last 7 days">
                Last 7 Days
              </ToggleButton>
              <ToggleButton value="last30Days" aria-label="last 30 days">
                Last 30 Days
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          
          <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
            <Button 
              variant="outlined" 
              onClick={handleClear}
              startIcon={<ClearIcon />}
              disabled={searching}
            >
              Clear
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSearch} 
              disabled={searching}
              startIcon={searching ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </Box>
        </Paper>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {hasSearched && (
          <Box>
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Search Results
                {searchResults.length > 0 && (
                  <Typography component="span" variant="body2" color="textSecondary" sx={{ ml: 2 }}>
                    ({searchResults.length} results found)
                  </Typography>
                )}
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              {searching ? (
                <Box display="flex" justifyContent="center" my={4}>
                  <CircularProgress />
                </Box>
              ) : searchResults.length === 0 ? (
                <Typography variant="body1" align="center" sx={{ py: 4 }}>
                  No results found. Try adjusting your search criteria.
                </Typography>
              ) : (
                <Box>
                  <Grid container spacing={3}>
                    {searchResults.map((result) => (
                      <Grid item xs={12} key={result._id}>
                        <ResultItem result={result} />
                      </Grid>
                    ))}
                  </Grid>
                  
                  {totalPages > 1 && (
                    <Box display="flex" justifyContent="center" mt={4}>
                      <Pagination 
                        count={totalPages} 
                        page={page} 
                        onChange={handlePageChange} 
                        color="primary" 
                        disabled={searching}
                        size="large"
                        showFirstButton
                        showLastButton
                      />
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default VisionSearch;