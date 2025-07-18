// client/src/components/search/ResultItem.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
  IconButton,
  Collapse,
  Grid,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import HlsStreamViewer from '../streams/HlsStreamViewer';

const ResultItem = ({ result }) => {
  const [expanded, setExpanded] = useState(false);
  const [playbackOpen, setPlaybackOpen] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handlePlaybackOpen = () => {
    setPlaybackOpen(true);
  };

  const handlePlaybackClose = () => {
    setPlaybackOpen(false);
  };

  const formattedDate = result.timestamp
    ? format(new Date(result.timestamp), 'PPpp')
    : 'Unknown date';

  // Extract recording info from metadata if available
  const recordingFolder = result.metadata?.recordingFolder || null;
  const streamId = result.streamId?._id || result.streamId;
  const hasVideoAvailable = Boolean(streamId && recordingFolder);

  // Add this debugging code after the extraction to help you troubleshoot
  // useEffect(() => {
  //   if (streamId && recordingFolder) {
  //     console.debug(`Result has recording available: streamId=${streamId}, folder=${recordingFolder}`);
  //   } else if (streamId) {
  //     console.debug(`Result has no recording folder: streamId=${streamId}`);
  //   }
  // }, [streamId, recordingFolder]);
  console.log(`Passing to HlsStreamViewer: streamId=${streamId}, recordingFolder=${recordingFolder}`);
  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ position: 'relative' }}>
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

              {hasVideoAvailable && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayIcon />}
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    opacity: 0.9,
                    backgroundColor: 'primary.dark', // Make it more visible
                    '&:hover': {
                      backgroundColor: 'primary.main',
                    }
                  }}
                  onClick={handlePlaybackOpen}
                >
                  Play Recording
                </Button>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="subtitle1" fontWeight="medium">
                  {result.streamId?.name || "Unknown Camera"}
                </Typography>
                <Typography variant="subtitle2" color="textSecondary">
                  {formattedDate}
                </Typography>
              </Box>

              <IconButton
                onClick={handleExpandClick}
                aria-expanded={expanded}
                aria-label="show more"
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
              {result.promptId && (
                <Chip
                  size="small"
                  label={`Prompt: ${result.promptId.name || "Unknown"}`}
                  color="primary"
                  variant="outlined"
                />
              )}

              {result.processingTime && (
                <Chip
                  size="small"
                  label={`Processing: ${result.processingTime}ms`}
                  color="default"
                  variant="outlined"
                />
              )}

              {/* Add tags for detected objects or events if available */}
              {result.detections && Object.entries(result.detections).map(([key, value]) => {
                if (value === true) {
                  return (
                    <Chip
                      key={key}
                      size="small"
                      label={key.charAt(0).toUpperCase() + key.slice(1)}
                      color="secondary"
                    />
                  );
                }
                return null;
              })}
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="body2" sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.5,
            }}>
              {result.result}
            </Typography>
          </Grid>
        </Grid>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box mt={2}>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="body1" component="div" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Full Analysis:
              </Typography>
              <Box sx={{ whiteSpace: 'pre-wrap', ml: 1 }}>
                {result.result}
              </Box>
            </Typography>

            {hasVideoAvailable && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayIcon />}
                onClick={handlePlaybackOpen}
              >
                Play Video Recording
              </Button>
            )}
          </Box>
        </Collapse>
      </CardContent>

      {/* Playback Dialog */}
      <Dialog
        open={playbackOpen}
        onClose={handlePlaybackClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {result.streamId?.name || "Stream"} - {formattedDate}
            </Typography>
            <IconButton onClick={handlePlaybackClose} edge="end">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {playbackOpen && hasVideoAvailable && (
            <>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Playing recording from folder: {recordingFolder}
              </Typography>
              <HlsStreamViewer
                streamId={streamId}
                recordingFolder={recordingFolder}
                isHistorical={true}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ResultItem;