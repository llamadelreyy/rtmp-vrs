import { 
    Box, 
    Typography, 
    Grid2, 
    Paper, 
    List, 
    ListItem, 
    ListItemText 
  } from '@mui/material';

const SearchResults = ({ results }) => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6">Search Results</Typography>
      <Grid2 container spacing={2}>
        {results.matchedStreams.map(stream => (
          <Grid2 item xs={12} md={6} lg={4} key={stream.id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">{stream.name}</Typography>
              <Typography variant="body2" color="textSecondary">
                Location: {stream.location}
              </Typography>
              
              {/* Show detected events for this stream */}
              {results.detectedObjects
                .filter(obj => obj.streamId === stream.id)
                .map(obj => (
                  <Box key={obj.id} sx={{ mt: 1 }}>
                    <Typography variant="subtitle2">
                      {obj.type} ({Math.round(obj.confidence * 100)}% confidence)
                    </Typography>
                    <Typography variant="body2">{obj.description}</Typography>
                    {obj.imageUrl && (
                      <Box sx={{ mt: 1 }}>
                        <img 
                          src={obj.imageUrl} 
                          alt={obj.description}
                          style={{ maxWidth: '100%', height: 'auto' }}
                        />
                      </Box>
                    )}
                  </Box>
              ))}
            </Paper>
          </Grid2>
        ))}
      </Grid2>
  
      {/* Timeline */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6">Event Timeline</Typography>
        <List>
          {results.eventTimeline.map((event, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={event.event}
                secondary={`${event.time} - ${event.type} (${Math.round(event.confidence * 100)}% confidence)`}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
);

export default SearchResults;
