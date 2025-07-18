import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { testStream } from '../../../api/streams';

// Validation schema for stream form
const StreamSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .max(50, 'Name cannot be more than 50 characters'),
  url: Yup.string()
    .required('URL is required')
    .matches(
      /^(rtsp|http|https):\/\/.*/,
      'URL must start with rtsp://, http://, or https://'
    ),
  type: Yup.string().required('Type is required'),
  description: Yup.string().max(
    200,
    'Description cannot be more than 200 characters'
  ),
  location: Yup.string().max(
    100,
    'Location cannot be more than 100 characters'
  ),
  'credentials.username': Yup.string(),
  'credentials.password': Yup.string(),
  'settings.lowLatency': Yup.boolean(),
  'settings.autoReconnect': Yup.boolean(),
  'settings.reconnectInterval': Yup.number().min(
    1000,
    'Interval must be at least 1000ms'
  ),
});

const TestButton = styled(Button)(({ theme }) => ({
  marginLeft: theme.spacing(1),
}));

const initialValues = {
  name: '',
  url: '',
  type: 'rtsp',
  description: '',
  location: '',
  credentials: {
    username: '',
    password: '',
  },
  settings: {
    lowLatency: true,
    autoReconnect: true,
    reconnectInterval: 5000,
  },
};

const AddEditStreamDialog = ({
  open,
  onClose,
  onSubmit,
  currentStream,
  dialogMode,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testingUrl, setTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Handle test stream connection
  const handleTestStream = async (url, type, credentials) => {
    try {
      setTestingUrl(true);
      setTestResult(null);

      const result = await testStream({
        url,
        type,
        credentials,
      });

      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to test stream connection',
      });
    } finally {
      setTestingUrl(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {dialogMode === 'add' ? 'Add New Stream' : 'Edit Stream'}
      </DialogTitle>

      <Formik
        initialValues={currentStream || initialValues}
        validationSchema={StreamSchema}
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    fullWidth
                    label="Stream Name"
                    name="name"
                    variant="outlined"
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl variant="outlined" fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="stream-type-label">Stream Type</InputLabel>
                    <Field
                      as={Select}
                      labelId="stream-type-label"
                      label="Stream Type"
                      name="type"
                    >
                      <MenuItem value="rtsp">RTSP</MenuItem>
                      <MenuItem value="http">HTTP</MenuItem>
                      <MenuItem value="hls">HLS</MenuItem>
                      <MenuItem value="mjpeg">MJPEG</MenuItem>
                    </Field>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    fullWidth
                    label="Stream URL"
                    name="url"
                    variant="outlined"
                    error={touched.url && Boolean(errors.url)}
                    helperText={touched.url && errors.url}
                    sx={{ mb: 2 }}
                    InputProps={{
                      endAdornment: (
                        <TestButton
                          color="primary"
                          disabled={isSubmitting || testingUrl || !values.url}
                          onClick={() =>
                            handleTestStream(
                              values.url,
                              values.type,
                              values.credentials
                            )
                          }
                        >
                          {testingUrl ? <CircularProgress size={24} /> : 'Test'}
                        </TestButton>
                      ),
                    }}
                  />

                  {testResult && (
                    <Box
                      mt={1}
                      p={2}
                      border={1}
                      borderColor={
                        testResult.success ? 'success.main' : 'error.main'
                      }
                      borderRadius={1}
                    >
                      <Typography
                        color={
                          testResult.success ? 'success.main' : 'error.main'
                        }
                      >
                        {testResult.success ? (
                          <CheckIcon
                            fontSize="small"
                            sx={{ verticalAlign: 'middle', mr: 1 }}
                          />
                        ) : (
                          <CloseIcon
                            fontSize="small"
                            sx={{ verticalAlign: 'middle', mr: 1 }}
                          />
                        )}
                        {testResult.message}
                      </Typography>

                      {testResult.success && testResult.details && (
                        <Typography variant="body2" color="text.secondary">
                          Resolution: {testResult.details.resolution}, Codec:{' '}
                          {testResult.details.codec}, Framerate:{' '}
                          {testResult.details.framerate} fps
                        </Typography>
                      )}
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    fullWidth
                    label="Description"
                    name="description"
                    variant="outlined"
                    multiline
                    rows={2}
                    error={touched.description && Boolean(errors.description)}
                    helperText={touched.description && errors.description}
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    fullWidth
                    label="Location"
                    name="location"
                    variant="outlined"
                    error={touched.location && Boolean(errors.location)}
                    helperText={touched.location && errors.location}
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Authentication (if required)
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    fullWidth
                    label="Username"
                    name="credentials.username"
                    variant="outlined"
                    error={
                      touched.credentials?.username &&
                      Boolean(errors.credentials?.username)
                    }
                    helperText={
                      touched.credentials?.username &&
                      errors.credentials?.username
                    }
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    fullWidth
                    label="Password"
                    name="credentials.password"
                    type="password"
                    variant="outlined"
                    error={
                      touched.credentials?.password &&
                      Boolean(errors.credentials?.password)
                    }
                    helperText={
                      touched.credentials?.password &&
                      errors.credentials?.password
                    }
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    color="primary"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced
                      ? 'Hide Advanced Settings'
                      : 'Show Advanced Settings'}
                  </Button>
                </Grid>

                {showAdvanced && (
                  <>
                    <Grid item xs={12}>
                      <Divider />
                      <Typography variant="subtitle2" sx={{ mt: 2 }}>
                        Advanced Settings
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Field
                            as={Switch}
                            name="settings.lowLatency"
                            color="primary"
                            checked={values.settings.lowLatency}
                          />
                        }
                        label="Low Latency Mode"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Field
                            as={Switch}
                            name="settings.autoReconnect"
                            color="primary"
                            checked={values.settings.autoReconnect}
                          />
                        }
                        label="Auto Reconnect"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Field
                        as={TextField}
                        fullWidth
                        label="Reconnect Interval (ms)"
                        name="settings.reconnectInterval"
                        type="number"
                        variant="outlined"
                        disabled={!values.settings.autoReconnect}
                        error={
                          touched.settings?.reconnectInterval &&
                          Boolean(errors.settings?.reconnectInterval)
                        }
                        helperText={
                          touched.settings?.reconnectInterval &&
                          errors.settings?.reconnectInterval
                        }
                        sx={{ mb: 2 }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl variant="outlined" fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="stream-category-label">
                          Category
                        </InputLabel>
                        <Field
                          as={Select}
                          labelId="stream-category-label"
                          label="Category"
                          name="category"
                        >
                          <MenuItem value="door">Door Camera</MenuItem>
                          <MenuItem value="store">Store Camera</MenuItem>
                          <MenuItem value="escalator">
                            Escalator Camera
                          </MenuItem>
                          <MenuItem value="elevator">Elevator Camera</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                        </Field>
                      </FormControl>
                    </Grid>
                  </>
                )}
              </Grid>
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} color="inherit">
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
                variant="contained"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} />
                ) : dialogMode === 'add' ? (
                  'Add Stream'
                ) : (
                  'Update Stream'
                )}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default AddEditStreamDialog;
