// client/src/components/search/SearchFilters.jsx
import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const SearchFilters = ({ filters, onFilterChange, streams = [], streamsLoading }) => {
  const handleChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  return (
    <Box component="form">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Search Query"
            placeholder="Enter keywords to search for (e.g., person, car, dog)"
            value={filters.query || ''}
            onChange={(e) => handleChange('query', e.target.value)}
            variant="outlined"
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="stream-select-label">Camera Stream</InputLabel>
            <Select
              labelId="stream-select-label"
              id="stream-select"
              value={filters.streamId || ''}
              label="Camera Stream"
              onChange={(e) => handleChange('streamId', e.target.value)}
              disabled={streamsLoading}
            >
              <MenuItem value="">
                <em>All Streams</em>
              </MenuItem>
              {streamsLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                  Loading...
                </MenuItem>
              ) : (
                streams.map((stream) => (
                  <MenuItem key={stream._id} value={stream._id}>
                    {stream.name || stream.url}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <DatePicker
            label="From Date"
            value={filters.fromDate ? dayjs(filters.fromDate) : null}
            onChange={(newValue) => handleChange('fromDate', newValue)}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <DatePicker
            label="To Date"
            value={filters.toDate ? dayjs(filters.toDate) : null}
            onChange={(newValue) => handleChange('toDate', newValue)}
            slotProps={{ textField: { fullWidth: true } }}
            minDate={filters.fromDate ? dayjs(filters.fromDate) : null}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default SearchFilters;