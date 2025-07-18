import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  IconButton,
  Box,
  Tabs,
  Tab,
  Typography,
  Grid,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import StreamPlayer from '../streams/StreamPlayer';
import StreamPrompts from '../streams/StreamPrompt';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stream-tabpanel-${index}`}
      aria-labelledby={`stream-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const StreamDetailsDialog = ({
  open,
  onClose,
  stream,
  isOperator,
  onEdit,
  onNavigateToMonitor,
  onToggleStatus,
}) => {
  const [tabValue, setTabValue] = useState(0);

  // Handle tab change
  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

  if (!stream) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        {stream.name}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleChangeTab}
          aria-label="stream tabs"
          textColor="secondary"
          indicatorColor="secondary"
        >
          <Tab label="Preview" id="tab-0" />
          <Tab label="Info" id="tab-1" />
          <Tab label="Custom Prompts" id="tab-2" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ height: '400px', width: '100%' }}>
          <StreamPlayer stream={stream} />
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1">Stream Details</Typography>
            <Typography variant="body2">
              <strong>Status:</strong> {stream.status}
            </Typography>
            <Typography variant="body2">
              <strong>Type:</strong> {stream.type}
            </Typography>
            <Typography variant="body2">
              <strong>URL:</strong> {stream.url}
            </Typography>
            <Typography variant="body2">
              <strong>Location:</strong> {stream.location || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Description:</strong> {stream.description || 'N/A'}
            </Typography>
            {stream.settings && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  Settings
                </Typography>
                <Typography variant="body2">
                  <strong>Low Latency:</strong>{' '}
                  {stream.settings.lowLatency ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="body2">
                  <strong>Auto Reconnect:</strong>{' '}
                  {stream.settings.autoReconnect ? 'Yes' : 'No'}
                </Typography>
                {stream.settings.autoReconnect && (
                  <Typography variant="body2">
                    <strong>Reconnect Interval:</strong>{' '}
                    {stream.settings.reconnectInterval}ms
                  </Typography>
                )}
              </>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            {isOperator && (
              <>
                <Typography variant="subtitle1">Actions</Typography>
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      onClose();
                      onEdit(stream);
                    }}
                  >
                    Edit Stream
                  </Button>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<PlayIcon />}
                    onClick={() => {
                      onClose();
                      onNavigateToMonitor(stream._id);
                    }}
                  >
                    Monitor Stream
                  </Button>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    color={stream.status === 'active' ? 'error' : 'success'}
                    onClick={() => onToggleStatus(stream)}
                  >
                    {stream.status === 'active'
                      ? 'Deactivate Stream'
                      : 'Activate Stream'}
                  </Button>
                </Box>
              </>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <StreamPrompts streamId={stream._id} streamName={stream.name} />
      </TabPanel>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StreamDetailsDialog;
