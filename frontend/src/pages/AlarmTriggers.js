// frontend/src/pages/AlarmTriggers.js

import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
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
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  NotificationImportant as AlarmIcon,
  Schedule as ScheduleIcon,
  SmartToy as AIIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  PlayArrow as TestIcon,
  Notifications as NotificationsIcon,
  VolumeUp as SirenIcon,
  Webhook as WebhookIcon,
  Camera as CameraIcon
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

const RuleCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.02)',
  },
}));

const ActiveRuleCard = styled(RuleCard)(({ theme }) => ({
  borderLeft: `4px solid ${theme.palette.success.main}`,
}));

const InactiveRuleCard = styled(RuleCard)(({ theme }) => ({
  borderLeft: `4px solid ${theme.palette.grey[400]}`,
  opacity: 0.7,
}));

const AlarmsList = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  maxHeight: '400px',
  overflow: 'auto',
}));

const RuleDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    minWidth: '600px',
    maxWidth: '800px',
  },
}));

const AlarmTriggers = () => {
  const { streams } = useStreams();
  const [selectedTab, setSelectedTab] = useState(0);
  const [rules, setRules] = useState([]);
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [ruleDialog, setRuleDialog] = useState({ open: false, rule: null, mode: 'create' });
  const [ruleType, setRuleType] = useState('structured');

  // Mock data
  const mockRules = [
    {
      id: '1',
      name: 'Perimeter Breach Detection',
      type: 'structured',
      active: true,
      cameras: ['stream1', 'stream2'],
      conditions: {
        objectType: 'person',
        zone: 'perimeter',
        minCount: 1,
        duration: 5
      },
      actions: ['notification', 'siren', 'record'],
      schedule: { enabled: true, hours: '18:00-06:00' },
      lastTriggered: '2024-01-15T14:30:25.000Z'
    },
    {
      id: '2',
      name: 'Suspicious Loitering',
      type: 'prompt',
      active: true,
      cameras: ['stream1'],
      prompt: 'Detect if a person has been standing in the same location for more than 10 minutes without clear purpose',
      actions: ['notification', 'webhook'],
      schedule: { enabled: false },
      lastTriggered: null
    }
  ];

  const mockAlarms = [
    {
      id: '1',
      ruleId: '1',
      ruleName: 'Perimeter Breach Detection',
      timestamp: '2024-01-15T14:30:25.000Z',
      streamName: 'Front Door Camera',
      description: 'Person detected in restricted zone',
      status: 'active',
      acknowledged: false
    },
    {
      id: '2',
      ruleId: '2',
      ruleName: 'Suspicious Loitering',
      timestamp: '2024-01-15T12:15:10.000Z',
      streamName: 'Parking Lot Camera',
      description: 'Individual loitering for extended period',
      status: 'resolved',
      acknowledged: true
    }
  ];

  useEffect(() => {
    setRules(mockRules);
    setActiveAlarms(mockAlarms);
  }, []);

  const handleCreateRule = () => {
    setRuleDialog({ open: true, rule: null, mode: 'create' });
    setRuleType('structured');
  };

  const handleEditRule = (rule) => {
    setRuleDialog({ open: true, rule, mode: 'edit' });
    setRuleType(rule.type);
  };

  const handleDeleteRule = (ruleId) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      setRules(rules.filter(rule => rule.id !== ruleId));
    }
  };

  const handleToggleRule = (ruleId) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, active: !rule.active } : rule
    ));
  };

  const handleSaveRule = (ruleData) => {
    if (ruleDialog.mode === 'create') {
      const newRule = {
        ...ruleData,
        id: Date.now().toString(),
        lastTriggered: null
      };
      setRules([...rules, newRule]);
    } else {
      setRules(rules.map(rule => 
        rule.id === ruleDialog.rule.id ? { ...ruleDialog.rule, ...ruleData } : rule
      ));
    }
    setRuleDialog({ open: false, rule: null, mode: 'create' });
  };

  const handleTestRule = (rule) => {
    alert(`Testing rule: ${rule.name}\nThis would simulate the trigger conditions.`);
  };

  const handleAcknowledgeAlarm = (alarmId) => {
    setActiveAlarms(activeAlarms.map(alarm =>
      alarm.id === alarmId ? { ...alarm, acknowledged: true } : alarm
    ));
  };

  const handleResolveAlarm = (alarmId) => {
    setActiveAlarms(activeAlarms.map(alarm =>
      alarm.id === alarmId ? { ...alarm, status: 'resolved' } : alarm
    ));
  };

  const unacknowledgedCount = activeAlarms.filter(alarm => !alarm.acknowledged && alarm.status === 'active').length;

  const renderRuleForm = () => {
    const rule = ruleDialog.rule || {
      name: '',
      type: ruleType,
      active: true,
      cameras: [],
      conditions: {
        objectType: 'person',
        zone: '',
        minCount: 1,
        duration: 5
      },
      prompt: '',
      actions: [],
      schedule: { enabled: false, hours: '00:00-23:59' }
    };

    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Rule Name"
              value={rule.name}
              onChange={(e) => setRuleDialog({
                ...ruleDialog,
                rule: { ...rule, name: e.target.value }
              })}
            />
          </Grid>

          <Grid item xs={12}>
            <Tabs value={ruleType} onChange={(e, value) => setRuleType(value)}>
              <Tab value="structured" label="Structured Rules" />
              <Tab value="prompt" label="Natural Language" />
            </Tabs>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Cameras</InputLabel>
              <Select
                multiple
                value={rule.cameras}
                onChange={(e) => setRuleDialog({
                  ...ruleDialog,
                  rule: { ...rule, cameras: e.target.value }
                })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const stream = streams.find(s => s._id === value);
                      return <Chip key={value} label={stream?.name || value} size="small" />;
                    })}
                  </Box>
                )}
              >
                {streams.map((stream) => (
                  <MenuItem key={stream._id} value={stream._id}>
                    {stream.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {ruleType === 'structured' ? (
            <>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Object Type</InputLabel>
                  <Select
                    value={rule.conditions?.objectType || 'person'}
                    onChange={(e) => setRuleDialog({
                      ...ruleDialog,
                      rule: { 
                        ...rule, 
                        conditions: { ...rule.conditions, objectType: e.target.value }
                      }
                    })}
                  >
                    <MenuItem value="person">Person</MenuItem>
                    <MenuItem value="vehicle">Vehicle</MenuItem>
                    <MenuItem value="animal">Animal</MenuItem>
                    <MenuItem value="object">Object</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Zone Name"
                  value={rule.conditions?.zone || ''}
                  onChange={(e) => setRuleDialog({
                    ...ruleDialog,
                    rule: { 
                      ...rule, 
                      conditions: { ...rule.conditions, zone: e.target.value }
                    }
                  })}
                />
              </Grid>

              <Grid item xs={6}>
                <Typography gutterBottom>Minimum Count: {rule.conditions?.minCount || 1}</Typography>
                <Slider
                  value={rule.conditions?.minCount || 1}
                  onChange={(e, value) => setRuleDialog({
                    ...ruleDialog,
                    rule: { 
                      ...rule, 
                      conditions: { ...rule.conditions, minCount: value }
                    }
                  })}
                  min={1}
                  max={10}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>

              <Grid item xs={6}>
                <Typography gutterBottom>Duration (seconds): {rule.conditions?.duration || 5}</Typography>
                <Slider
                  value={rule.conditions?.duration || 5}
                  onChange={(e, value) => setRuleDialog({
                    ...ruleDialog,
                    rule: { 
                      ...rule, 
                      conditions: { ...rule.conditions, duration: value }
                    }
                  })}
                  min={1}
                  max={300}
                  valueLabelDisplay="auto"
                />
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Natural Language Rule"
                placeholder="Describe the condition you want to detect in plain English..."
                value={rule.prompt || ''}
                onChange={(e) => setRuleDialog({
                  ...ruleDialog,
                  rule: { ...rule, prompt: e.target.value }
                })}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Actions</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {[
                { id: 'notification', label: 'Notification', icon: <NotificationsIcon /> },
                { id: 'siren', label: 'Siren/Alert', icon: <SirenIcon /> },
                { id: 'webhook', label: 'Webhook', icon: <WebhookIcon /> },
                { id: 'record', label: 'Record Clip', icon: <CameraIcon /> }
              ].map((action) => (
                <FormControlLabel
                  key={action.id}
                  control={
                    <Switch
                      checked={rule.actions?.includes(action.id) || false}
                      onChange={(e) => {
                        const actions = rule.actions || [];
                        const newActions = e.target.checked
                          ? [...actions, action.id]
                          : actions.filter(a => a !== action.id);
                        setRuleDialog({
                          ...ruleDialog,
                          rule: { ...rule, actions: newActions }
                        });
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {action.icon}
                      {action.label}
                    </Box>
                  }
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Schedule Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControlLabel
                  control={
                    <Switch
                      checked={rule.schedule?.enabled || false}
                      onChange={(e) => setRuleDialog({
                        ...ruleDialog,
                        rule: { 
                          ...rule, 
                          schedule: { ...rule.schedule, enabled: e.target.checked }
                        }
                      })}
                    />
                  }
                  label="Enable Schedule"
                />
                {rule.schedule?.enabled && (
                  <TextField
                    fullWidth
                    label="Active Hours (e.g., 18:00-06:00)"
                    value={rule.schedule?.hours || '00:00-23:59'}
                    onChange={(e) => setRuleDialog({
                      ...ruleDialog,
                      rule: { 
                        ...rule, 
                        schedule: { ...rule.schedule, hours: e.target.value }
                      }
                    })}
                    sx={{ mt: 2 }}
                  />
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Root>
      <HeaderSection>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Alarm Triggers
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Create and manage intelligent alarm rules for automated threat detection
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateRule}
        >
          Create Rule
        </Button>
      </HeaderSection>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
          <Tab label={`Rules (${rules.length})`} />
          <Tab 
            label={
              <Badge badgeContent={unacknowledgedCount} color="error">
                Active Alarms
              </Badge>
            } 
          />
        </Tabs>
      </Box>

      {selectedTab === 0 && (
        <Box>
          {rules.length === 0 ? (
            <Alert severity="info">
              No alarm rules configured. Create your first rule to start automated monitoring.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {rules.map((rule) => {
                const RuleCardComponent = rule.active ? ActiveRuleCard : InactiveRuleCard;
                return (
                  <Grid item xs={12} md={6} key={rule.id}>
                    <RuleCardComponent>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Typography variant="h6" gutterBottom>
                            {rule.name}
                          </Typography>
                          <Box display="flex" gap={1}>
                            <Chip 
                              icon={rule.type === 'structured' ? <SettingsIcon /> : <AIIcon />}
                              label={rule.type === 'structured' ? 'Structured' : 'AI Rule'}
                              size="small"
                              color="primary"
                            />
                            <Chip 
                              label={rule.active ? 'Active' : 'Inactive'}
                              size="small"
                              color={rule.active ? 'success' : 'default'}
                            />
                          </Box>
                        </Box>

                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Cameras: {rule.cameras.map(cameraId => {
                            const stream = streams.find(s => s._id === cameraId);
                            return stream?.name || cameraId;
                          }).join(', ')}
                        </Typography>

                        {rule.type === 'structured' ? (
                          <Typography variant="body2" gutterBottom>
                            Detect {rule.conditions?.minCount || 1}+ {rule.conditions?.objectType} 
                            {rule.conditions?.zone && ` in ${rule.conditions.zone}`} 
                            for {rule.conditions?.duration || 5}s
                          </Typography>
                        ) : (
                          <Typography variant="body2" gutterBottom>
                            {rule.prompt}
                          </Typography>
                        )}

                        <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
                          {rule.actions?.map((action) => (
                            <Chip key={action} label={action} size="small" variant="outlined" />
                          ))}
                        </Box>

                        {rule.lastTriggered && (
                          <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                            Last triggered: {new Date(rule.lastTriggered).toLocaleString()}
                          </Typography>
                        )}
                      </CardContent>

                      <CardActions>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={rule.active}
                              onChange={() => handleToggleRule(rule.id)}
                              size="small"
                            />
                          }
                          label="Active"
                        />
                        <Box sx={{ flexGrow: 1 }} />
                        <IconButton size="small" onClick={() => handleTestRule(rule)} title="Test Rule">
                          <TestIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleEditRule(rule)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteRule(rule.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </CardActions>
                    </RuleCardComponent>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {selectedTab === 1 && (
        <AlarmsList>
          <Typography variant="h6" gutterBottom>
            Active Alarms
          </Typography>
          {activeAlarms.length === 0 ? (
            <Alert severity="success">
              No active alarms. All systems operating normally.
            </Alert>
          ) : (
            <List>
              {activeAlarms.map((alarm) => (
                <React.Fragment key={alarm.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <AlarmIcon color={alarm.status === 'active' ? 'error' : 'success'} />
                          <Typography variant="h6">
                            {alarm.ruleName}
                          </Typography>
                          <Chip 
                            label={alarm.status} 
                            size="small"
                            color={alarm.status === 'active' ? 'error' : 'success'}
                          />
                          {!alarm.acknowledged && (
                            <Chip label="Unacknowledged" size="small" color="warning" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" gutterBottom>
                            {alarm.description}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {alarm.streamName} • {new Date(alarm.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        {!alarm.acknowledged && (
                          <Button
                            size="small"
                            onClick={() => handleAcknowledgeAlarm(alarm.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {alarm.status === 'active' && (
                          <Button
                            size="small"
                            color="success"
                            onClick={() => handleResolveAlarm(alarm.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </AlarmsList>
      )}

      {/* Rule Creation/Edit Dialog */}
      <RuleDialog
        open={ruleDialog.open}
        onClose={() => setRuleDialog({ open: false, rule: null, mode: 'create' })}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {ruleDialog.mode === 'create' ? 'Create New Rule' : 'Edit Rule'}
            </Typography>
            <IconButton onClick={() => setRuleDialog({ open: false, rule: null, mode: 'create' })}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {renderRuleForm()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialog({ open: false, rule: null, mode: 'create' })}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            startIcon={<SaveIcon />}
            onClick={() => handleSaveRule(ruleDialog.rule)}
          >
            {ruleDialog.mode === 'create' ? 'Create Rule' : 'Save Changes'}
          </Button>
        </DialogActions>
      </RuleDialog>
    </Root>
  );
};

export default AlarmTriggers;