// frontend/src/pages/BehaviorDetection.js

import React, { useState, useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Timeline as TimelineIcon,
  DirectionsRun as RunningIcon,
  AccessTime as LoiteringIcon,
  Remove as RemovedIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
  Assessment as AnalyticsIcon,
  PhotoCamera as CaptureIcon,
  CheckCircle as ValidIcon,
  Cancel as InvalidIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import useStreams from '../hooks/useStreams';

const Root = styled('div')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

const AnalyticsGrid = styled(Grid)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const ZoneEditorContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

const VideoCanvas = styled('canvas')({
  width: '100%',
  height: 'auto',
  cursor: 'crosshair',
});

const ZoneOverlay = styled('svg')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
});

const DetectionCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.02)',
  },
}));

const AccuracyChip = styled(Chip)(({ theme, accuracy }) => ({
  backgroundColor: accuracy >= 0.8 ? theme.palette.success.light : 
                  accuracy >= 0.6 ? theme.palette.warning.light : 
                  theme.palette.error.light,
  color: theme.palette.getContrastText(
    accuracy >= 0.8 ? theme.palette.success.light : 
    accuracy >= 0.6 ? theme.palette.warning.light : 
    theme.palette.error.light
  ),
}));

const BehaviorDetection = () => {
  const { streams } = useStreams();
  const [selectedTab, setSelectedTab] = useState(0);
  const [zones, setZones] = useState([]);
  const [behaviors, setBehaviors] = useState([]);
  const [detections, setDetections] = useState([]);
  const [selectedStream, setSelectedStream] = useState('');
  const [zoneDialog, setZoneDialog] = useState({ open: false, zone: null });
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [currentZonePoints, setCurrentZonePoints] = useState([]);
  const canvasRef = useRef(null);
  const [analytics, setAnalytics] = useState({
    totalDetections: 0,
    accuracy: 0,
    falsePositives: 0,
    truePositives: 0
  });

  // Mock data
  const behaviorTypes = [
    { id: 'loitering', name: 'Loitering', icon: <LoiteringIcon />, description: 'Person staying in one area for extended time' },
    { id: 'running', name: 'Running', icon: <RunningIcon />, description: 'Fast movement detection' },
    { id: 'left_object', name: 'Left Object', icon: <RemovedIcon />, description: 'Object left behind in area' },
    { id: 'removed_object', name: 'Removed Object', icon: <RemovedIcon />, description: 'Object removed from area' },
    { id: 'fence_climbing', name: 'Fence Climbing', icon: <SecurityIcon />, description: 'Climbing over barriers' },
    { id: 'restricted_access', name: 'Restricted Access', icon: <SecurityIcon />, description: 'Entry to restricted zones' }
  ];

  const mockZones = [
    {
      id: '1',
      name: 'Entrance Zone',
      streamId: 'stream1',
      points: [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 200 }, { x: 100, y: 200 }],
      behaviors: ['loitering', 'restricted_access'],
      color: '#ff0000',
      active: true
    },
    {
      id: '2',
      name: 'Parking Area',
      streamId: 'stream2',
      points: [{ x: 150, y: 150 }, { x: 400, y: 150 }, { x: 400, y: 300 }, { x: 150, y: 300 }],
      behaviors: ['left_object', 'loitering'],
      color: '#00ff00',
      active: true
    }
  ];

  const mockDetections = [
    {
      id: '1',
      timestamp: '2024-01-15T14:30:25.000Z',
      streamName: 'Front Door Camera',
      zoneName: 'Entrance Zone',
      behavior: 'loitering',
      duration: 600, // seconds
      confidence: 0.89,
      thumbnail: '/api/thumbnails/detection1.jpg',
      status: 'valid',
      validated: true
    },
    {
      id: '2',
      timestamp: '2024-01-15T12:15:10.000Z',
      streamName: 'Parking Lot Camera',
      zoneName: 'Parking Area',
      behavior: 'left_object',
      duration: 120,
      confidence: 0.75,
      thumbnail: '/api/thumbnails/detection2.jpg',
      status: 'false_positive',
      validated: true
    }
  ];

  useEffect(() => {
    setZones(mockZones);
    setDetections(mockDetections);
    setBehaviors(behaviorTypes);
    
    // Calculate analytics
    const validated = mockDetections.filter(d => d.validated);
    const truePositives = validated.filter(d => d.status === 'valid').length;
    const falsePositives = validated.filter(d => d.status === 'false_positive').length;
    
    setAnalytics({
      totalDetections: mockDetections.length,
      accuracy: validated.length > 0 ? truePositives / validated.length : 0,
      falsePositives,
      truePositives
    });
  }, []);

  const handleCanvasClick = (event) => {
    if (!isDrawingZone) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setCurrentZonePoints([...currentZonePoints, { x, y }]);
  };

  const handleFinishZone = () => {
    if (currentZonePoints.length >= 3) {
      setZoneDialog({
        open: true,
        zone: {
          points: currentZonePoints,
          streamId: selectedStream,
          name: '',
          behaviors: [],
          color: '#ff0000',
          active: true
        }
      });
    }
    setIsDrawingZone(false);
    setCurrentZonePoints([]);
  };

  const handleSaveZone = (zoneData) => {
    if (zoneDialog.zone.id) {
      // Edit existing zone
      setZones(zones.map(zone => 
        zone.id === zoneDialog.zone.id ? { ...zoneDialog.zone, ...zoneData } : zone
      ));
    } else {
      // Create new zone
      const newZone = {
        ...zoneData,
        id: Date.now().toString(),
        points: zoneDialog.zone.points,
        streamId: selectedStream
      };
      setZones([...zones, newZone]);
    }
    setZoneDialog({ open: false, zone: null });
  };

  const handleDeleteZone = (zoneId) => {
    if (window.confirm('Are you sure you want to delete this zone?')) {
      setZones(zones.filter(zone => zone.id !== zoneId));
    }
  };

  const handleValidateDetection = (detectionId, isValid) => {
    setDetections(detections.map(detection =>
      detection.id === detectionId 
        ? { 
            ...detection, 
            status: isValid ? 'valid' : 'false_positive',
            validated: true
          }
        : detection
    ));
  };

  const renderZoneEditor = () => {
    const selectedStreamData = streams.find(s => s._id === selectedStream);
    
    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Select Camera</InputLabel>
            <Select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              label="Select Camera"
            >
              {streams.map((stream) => (
                <MenuItem key={stream._id} value={stream._id}>
                  {stream.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsDrawingZone(true)}
            disabled={!selectedStream || isDrawingZone}
          >
            {isDrawingZone ? 'Click to add points...' : 'Draw Zone'}
          </Button>
          
          {isDrawingZone && (
            <Button
              variant="outlined"
              onClick={handleFinishZone}
              disabled={currentZonePoints.length < 3}
            >
              Finish Zone ({currentZonePoints.length} points)
            </Button>
          )}
        </Box>

        {selectedStream && (
          <ZoneEditorContainer>
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              onClick={handleCanvasClick}
              style={{ 
                width: '100%', 
                height: 'auto', 
                backgroundColor: '#f0f0f0',
                cursor: isDrawingZone ? 'crosshair' : 'default'
              }}
            />
            <ZoneOverlay width="100%" height="100%" viewBox="0 0 640 480">
              {/* Render existing zones */}
              {zones
                .filter(zone => zone.streamId === selectedStream)
                .map(zone => (
                  <polygon
                    key={zone.id}
                    points={zone.points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill={zone.color}
                    fillOpacity={0.3}
                    stroke={zone.color}
                    strokeWidth={2}
                  />
                ))}
              
              {/* Render current drawing zone */}
              {currentZonePoints.length > 0 && (
                <>
                  <polygon
                    points={currentZonePoints.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="#ffff00"
                    fillOpacity={0.3}
                    stroke="#ffff00"
                    strokeWidth={2}
                  />
                  {currentZonePoints.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={5}
                      fill="#ffff00"
                    />
                  ))}
                </>
              )}
            </ZoneOverlay>
          </ZoneEditorContainer>
        )}

        {/* Zone List */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Configured Zones
          </Typography>
          {zones.length === 0 ? (
            <Alert severity="info">
              No zones configured. Draw zones on the camera feed to enable behavior detection.
            </Alert>
          ) : (
            <List>
              {zones.map((zone) => {
                const streamName = streams.find(s => s._id === zone.streamId)?.name || 'Unknown Camera';
                return (
                  <React.Fragment key={zone.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6">{zone.name}</Typography>
                            <Chip 
                              label={zone.active ? 'Active' : 'Inactive'}
                              size="small"
                              color={zone.active ? 'success' : 'default'}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" gutterBottom>
                              Camera: {streamName}
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                              {zone.behaviors.map(behaviorId => {
                                const behavior = behaviors.find(b => b.id === behaviorId);
                                return (
                                  <Chip 
                                    key={behaviorId}
                                    label={behavior?.name || behaviorId}
                                    size="small"
                                    variant="outlined"
                                  />
                                );
                              })}
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          onClick={() => setZoneDialog({ open: true, zone })}
                          title="Edit Zone"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          onClick={() => handleDeleteZone(zone.id)}
                          color="error"
                          title="Delete Zone"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>
      </Box>
    );
  };

  const renderValidationTools = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Detection Validation
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Review and validate behavior detections to improve accuracy
      </Typography>

      {/* Analytics Summary */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {analytics.totalDetections}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Detections
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {Math.round(analytics.accuracy * 100)}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Accuracy Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {analytics.truePositives}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                True Positives
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="error.main">
                {analytics.falsePositives}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                False Positives
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detection List */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Camera</TableCell>
              <TableCell>Zone</TableCell>
              <TableCell>Behavior</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detections.map((detection) => (
              <TableRow key={detection.id}>
                <TableCell>
                  {new Date(detection.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>{detection.streamName}</TableCell>
                <TableCell>{detection.zoneName}</TableCell>
                <TableCell>
                  <Chip 
                    label={behaviors.find(b => b.id === detection.behavior)?.name || detection.behavior}
                    size="small"
                  />
                </TableCell>
                <TableCell>{Math.round(detection.duration / 60)}m {detection.duration % 60}s</TableCell>
                <TableCell>
                  <AccuracyChip 
                    label={`${Math.round(detection.confidence * 100)}%`}
                    size="small"
                    accuracy={detection.confidence}
                  />
                </TableCell>
                <TableCell>
                  {detection.validated ? (
                    <Chip 
                      label={detection.status === 'valid' ? 'Valid' : 'False Positive'}
                      size="small"
                      color={detection.status === 'valid' ? 'success' : 'error'}
                    />
                  ) : (
                    <Chip label="Pending" size="small" color="warning" />
                  )}
                </TableCell>
                <TableCell>
                  {!detection.validated && (
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleValidateDetection(detection.id, true)}
                        title="Mark as Valid"
                      >
                        <ValidIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleValidateDetection(detection.id, false)}
                        title="Mark as False Positive"
                      >
                        <InvalidIcon />
                      </IconButton>
                    </Box>
                  )}
                  <IconButton size="small" title="View Details">
                    <ViewIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Root>
      <HeaderSection>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Behavior Detection
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Advanced analytics with zone-based behavior monitoring and validation tools
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<AnalyticsIcon />}
          >
            View Analytics
          </Button>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
          >
            Settings
          </Button>
        </Box>
      </HeaderSection>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
          <Tab label="Zone Editor" />
          <Tab 
            label={
              <Badge badgeContent={detections.filter(d => !d.validated).length} color="warning">
                Validation Tools
              </Badge>
            } 
          />
          <Tab label="Behavior Settings" />
        </Tabs>
      </Box>

      {selectedTab === 0 && renderZoneEditor()}
      {selectedTab === 1 && renderValidationTools()}
      {selectedTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Behavior Configuration
          </Typography>
          <Grid container spacing={3}>
            {behaviors.map((behavior) => (
              <Grid item xs={12} sm={6} md={4} key={behavior.id}>
                <DetectionCard>
                  <CardHeader
                    avatar={behavior.icon}
                    title={behavior.name}
                    action={
                      <Switch defaultChecked />
                    }
                  />
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      {behavior.description}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography gutterBottom>Sensitivity</Typography>
                      <Slider
                        defaultValue={50}
                        step={10}
                        marks
                        min={0}
                        max={100}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </CardContent>
                </DetectionCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Zone Configuration Dialog */}
      <Dialog
        open={zoneDialog.open}
        onClose={() => setZoneDialog({ open: false, zone: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {zoneDialog.zone?.id ? 'Edit Zone' : 'Create Zone'}
            </Typography>
            <IconButton onClick={() => setZoneDialog({ open: false, zone: null })}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Zone Name"
              value={zoneDialog.zone?.name || ''}
              onChange={(e) => setZoneDialog({
                ...zoneDialog,
                zone: { ...zoneDialog.zone, name: e.target.value }
              })}
              sx={{ mb: 3 }}
            />
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Behaviors to Detect</InputLabel>
              <Select
                multiple
                value={zoneDialog.zone?.behaviors || []}
                onChange={(e) => setZoneDialog({
                  ...zoneDialog,
                  zone: { ...zoneDialog.zone, behaviors: e.target.value }
                })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const behavior = behaviors.find(b => b.id === value);
                      return <Chip key={value} label={behavior?.name || value} size="small" />;
                    })}
                  </Box>
                )}
              >
                {behaviors.map((behavior) => (
                  <MenuItem key={behavior.id} value={behavior.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {behavior.icon}
                      {behavior.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Zone Color"
              type="color"
              value={zoneDialog.zone?.color || '#ff0000'}
              onChange={(e) => setZoneDialog({
                ...zoneDialog,
                zone: { ...zoneDialog.zone, color: e.target.value }
              })}
              sx={{ mb: 3 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={zoneDialog.zone?.active ?? true}
                  onChange={(e) => setZoneDialog({
                    ...zoneDialog,
                    zone: { ...zoneDialog.zone, active: e.target.checked }
                  })}
                />
              }
              label="Zone Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZoneDialog({ open: false, zone: null })}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            startIcon={<SaveIcon />}
            onClick={() => handleSaveZone(zoneDialog.zone)}
          >
            Save Zone
          </Button>
        </DialogActions>
      </Dialog>
    </Root>
  );
};

export default BehaviorDetection;