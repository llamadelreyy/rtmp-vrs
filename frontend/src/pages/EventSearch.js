// frontend/src/pages/EventSearch.js

import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';
import {
  Search as SearchIcon,
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
  Event as EventIcon,
  SmartToy as AIIcon,
  List as ListIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import useStreams from '../hooks/useStreams';

const Root = styled('div')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
}));

const SearchSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const FiltersSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

const ResultsSection = styled(Box)(({ theme }) => ({
  minHeight: '400px',
}));

const SearchModeToggle = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const ResultCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const TimelineContainer = styled(Box)(({ theme }) => ({
  maxHeight: '600px',
  overflow: 'auto',
}));

const QuickFilterChips = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
}));

const EventSearch = () => {
  const { streams } = useStreams();
  const [searchMode, setSearchMode] = useState(0); // 0: keyword, 1: semantic
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // Default to all time so we can see existing data
  const [customStartTime, setCustomStartTime] = useState(new Date());
  const [customEndTime, setCustomEndTime] = useState(new Date());
  const [selectedCameras, setSelectedCameras] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultView, setResultView] = useState('list'); // 'list' or 'timeline'

  const quickFilters = [
    { label: 'Past Hour', value: '1h' },
    { label: 'Past 24 Hours', value: '24h' },
    { label: 'Past Week', value: '7d' },
    { label: 'Past Month', value: '30d' },
    { label: 'Past 3 Months', value: '90d' },
    { label: 'All Time', value: 'all' }
  ];

  const searchSuggestions = [
    'person walking',
    'car in parking lot',
    'package delivery',
    'security guard',
    'suspicious activity',
    'running person',
    'unauthorized access'
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // Calculate date range based on time filter
      const now = new Date();
      let fromDate;

      switch (timeFilter) {
        case '1h':
          fromDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          fromDate = new Date('2020-01-01'); // Very old date to get all results
          break;
        case 'custom':
          fromDate = customStartTime;
          break;
        default:
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // Default to 3 months
      }

      const toDate = timeFilter === 'custom' ? customEndTime : now;

      // Build search parameters
      const searchParams = new URLSearchParams({
        query: searchQuery.trim(),
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        page: '1',
        limit: '50',
        useEmbedding: searchMode === 1 ? 'true' : 'false', // Use semantic search for mode 1
        similarity: '0.3', // Reasonable similarity threshold
        prioritize: 'relevant'
      });

      // Add camera filter if specified
      if (selectedCameras.length > 0) {
        // For multiple cameras, we'll need to make separate requests
        // For now, use the first selected camera
        searchParams.append('streamId', selectedCameras[0]);
      }

      // Call the actual vision search API
      const response = await fetch(`/api/vision/search?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform the API response to match our expected format
      const transformedResults = data.docs.map(item => ({
        id: item._id,
        timestamp: item.timestamp,
        streamId: item.streamId,
        streamName: item.streamName || 'Unknown Camera',
        description: item.result || 'No description available',
        confidence: item.semanticScore || 0.8,
        eventType: item.eventType || 'Detection',
        thumbnail: item.imageUrl || null,
        videoUrl: item.metadata?.recordingFolder
          ? `/api/streams/${item.streamId}/hls/${item.metadata.recordingFolder}/playlist.m3u8`
          : null,
        processingTime: item.processingTime || 0,
        tokenCount: item.tokenCount || 0,
        metadata: item.metadata || {}
      }));

      setResults(transformedResults);
    } catch (error) {
      console.error('Search error:', error);
      // Show user-friendly error
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search when criteria change (but debounce for performance)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length > 2) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, timeFilter, selectedCameras, customStartTime, customEndTime, searchMode]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setResults([]);
  };

  const handleQuickFilter = (filterValue) => {
    setTimeFilter(filterValue);
  };

  const handlePlayVideo = (result) => {
    // Navigate to video player with timestamp
    const url = `/recordings/${result.streamId}?video=${encodeURIComponent(result.videoUrl)}&start=${result.startTime}`;
    window.open(url, '_blank');
  };

  const handleExportResults = () => {
    // Export search results to CSV/PDF
    const csvContent = results.map(r => 
      `"${r.timestamp}","${r.streamName}","${r.description}","${r.confidence}"`
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `search_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const renderResults = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Searching {searchMode === 1 ? 'with AI semantic analysis' : 'for keywords'}...
          </Typography>
        </Box>
      );
    }

    if (results.length === 0 && searchQuery) {
      return (
        <Alert severity="info">
          No events found matching your search criteria. Try adjusting your search terms or filters.
        </Alert>
      );
    }

    if (resultView === 'timeline') {
      return (
        <TimelineContainer>
          <Timeline>
            {results.map((result, index) => (
              <TimelineItem key={result.id}>
                <TimelineSeparator>
                  <TimelineDot color="primary">
                    <EventIcon />
                  </TimelineDot>
                  {index < results.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <ResultCard>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {new Date(result.timestamp).toLocaleString()}
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            {result.description}
                          </Typography>
                          <Box display="flex" gap={1} alignItems="center" mb={1}>
                            <Chip label={result.streamName} size="small" />
                            <Chip 
                              label={`${Math.round(result.confidence * 100)}% confidence`} 
                              size="small" 
                              color="primary" 
                            />
                          </Box>
                        </Box>
                        <Box display="flex" gap={1}>
                          <IconButton 
                            size="small" 
                            onClick={() => handlePlayVideo(result)}
                            title="Play Video"
                          >
                            <PlayIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </ResultCard>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </TimelineContainer>
      );
    }

    return (
      <List>
        {results.map((result) => (
          <ResultCard key={result.id}>
            <ListItem>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="h6">
                      {new Date(result.timestamp).toLocaleString()}
                    </Typography>
                    <Chip 
                      label={`${Math.round(result.confidence * 100)}%`} 
                      size="small" 
                      color="primary" 
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body1" gutterBottom>
                      {result.description}
                    </Typography>
                    <Box display="flex" gap={1} alignItems="center">
                      <Chip label={result.streamName} size="small" variant="outlined" />
                      <Chip label={result.eventType} size="small" />
                    </Box>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box display="flex" gap={1}>
                  <IconButton 
                    onClick={() => handlePlayVideo(result)}
                    title="Play Video"
                  >
                    <PlayIcon />
                  </IconButton>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          </ResultCard>
        ))}
      </List>
    );
  };

  return (
    <Root>
      <Typography variant="h4" component="h1" gutterBottom>
        Event Search
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Search through past events using keywords or AI-powered semantic search
      </Typography>

      <SearchSection>
        <SearchModeToggle>
          <Tabs value={searchMode} onChange={(e, newValue) => setSearchMode(newValue)}>
            <Tab 
              icon={<SearchIcon />} 
              label="Keyword Search" 
              iconPosition="start"
            />
            <Tab 
              icon={<AIIcon />} 
              label="Semantic Search" 
              iconPosition="start"
            />
          </Tabs>
        </SearchModeToggle>

        <Box display="flex" gap={2} alignItems="center">
          <TextField
            fullWidth
            placeholder={
              searchMode === 0 
                ? "Enter keywords to search events..." 
                : "Describe what you're looking for in natural language..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: searchMode === 0 ? <SearchIcon sx={{ mr: 1 }} /> : <AIIcon sx={{ mr: 1 }} />
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={!searchQuery.trim() || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
          >
            Search
          </Button>
          {searchQuery && (
            <Button
              variant="outlined"
              onClick={handleClearSearch}
              startIcon={<ClearIcon />}
            >
              Clear
            </Button>
          )}
        </Box>

        {searchMode === 0 && (
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Suggestions:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {searchSuggestions.map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  size="small"
                  onClick={() => setSearchQuery(suggestion)}
                  clickable
                />
              ))}
            </Box>
          </Box>
        )}
      </SearchSection>

      <FiltersSection>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                label="Time Range"
              >
                {quickFilters.map((filter) => (
                  <MenuItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </MenuItem>
                ))}
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {timeFilter === 'custom' && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Start Time"
                  value={customStartTime.toISOString().slice(0, 16)}
                  onChange={(e) => setCustomStartTime(new Date(e.target.value))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="End Time"
                  value={customEndTime.toISOString().slice(0, 16)}
                  onChange={(e) => setCustomEndTime(new Date(e.target.value))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Cameras</InputLabel>
              <Select
                multiple
                value={selectedCameras}
                onChange={(e) => setSelectedCameras(e.target.value)}
                label="Cameras"
              >
                {streams.map((stream) => (
                  <MenuItem key={stream._id} value={stream._id}>
                    {stream.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <QuickFilterChips>
          {quickFilters.map((filter) => (
            <Chip
              key={filter.value}
              label={filter.label}
              onClick={() => handleQuickFilter(filter.value)}
              color={timeFilter === filter.value ? "primary" : "default"}
              clickable
            />
          ))}
        </QuickFilterChips>
      </FiltersSection>

      <ResultsSection>
        {results.length > 0 && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </Typography>
            <Box display="flex" gap={2}>
              <Tabs 
                value={resultView} 
                onChange={(e, newValue) => setResultView(newValue)}
                variant="standard"
              >
                <Tab value="list" icon={<ListIcon />} label="List" iconPosition="start" />
                <Tab value="timeline" icon={<TimelineIcon />} label="Timeline" iconPosition="start" />
              </Tabs>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportResults}
                disabled={results.length === 0}
              >
                Export
              </Button>
            </Box>
          </Box>
        )}

        {renderResults()}
      </ResultsSection>
    </Root>
  );
};

export default EventSearch;