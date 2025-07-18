// client/src/components/SemanticSearch.jsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  Slider,
  Grid,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  CardMedia,
  Chip
} from '@mui/material';
import useVisionResults from '../hooks/useVisionResults';

const SemanticSearch = () => {
  const [query, setQuery] = useState('');
  const [useEmbedding, setUseEmbedding] = useState(true);
  const [similarity, setSimilarity] = useState(0.6);
  const [searchResults, setSearchResults] = useState([]);
  const [searchInfo, setSearchInfo] = useState(null);
  
  const { searchResults: performSearch, loading, error } = useVisionResults();
  
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    try {
      const results = await performSearch(query, {
        useEmbedding: useEmbedding,
        similarity: similarity,
        limit: 20
      });
      
      setSearchResults(results.results);
      setSearchInfo({
        totalResults: results.totalResults,
        searchMethod: results.searchMethod,
        query: query
      });
    } catch (err) {
      console.error('Search failed:', err);
    }
  };
  
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Semantic Vision Search
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for objects, activities, or situations..."
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={useEmbedding}
                  onChange={(e) => setUseEmbedding(e.target.checked)}
                  color="primary"
                />
              }
              label="Use Semantic Search"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              fullWidth
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
            </Button>
          </Grid>
          
          {useEmbedding && (
            <Grid item xs={12}>
              <Typography gutterBottom>
                Similarity Threshold: {similarity}
              </Typography>
              <Slider
                value={similarity}
                onChange={(_, value) => setSimilarity(value)}
                min={0.1}
                max={0.9}
                step={0.05}
                valueLabelDisplay="auto"
              />
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {error && (
        <Typography color="error" sx={{ my: 2 }}>
          Error: {error}
        </Typography>
      )}
      
      {searchInfo && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">
            Search Results: {searchInfo.totalResults} matches found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Search method: {searchInfo.searchMethod} | Query: "{searchInfo.query}"
          </Typography>
        </Box>
      )}
      
      <Grid container spacing={3}>
        {searchResults.map((result) => (
          <Grid item xs={12} sm={6} md={4} key={result._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {result.imageUrl && (
                <CardMedia
                  component="img"
                  height="200"
                  image={result.imageUrl}
                  alt="Vision result"
                  sx={{ objectFit: 'cover' }}
                />
              )}
              
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1">
                  {result.streamName || 'Unknown Stream'}
                </Typography>
                
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {new Date(result.timestamp).toLocaleString()}
                </Typography>
                
                <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                  {result.result}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  {result.eventType && (
                    <Chip 
                      label={result.eventType} 
                      color={
                        result.eventType === 'Fire' ? 'error' :
                        result.eventType === 'Intrusion' ? 'warning' :
                        result.eventType === 'Medical Emergency' ? 'info' :
                        'default'
                      }
                      size="small"
                    />
                  )}
                  
                  {result.semanticScore !== null && (
                    <Chip 
                      label={`Similarity: ${(result.semanticScore * 100).toFixed(1)}%`}
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {searchResults.length === 0 && searchInfo && (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography variant="h6" color="textSecondary">
            No results found for your search
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SemanticSearch;