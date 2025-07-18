// client/src/pages/StreamManagement.js
import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Typography,
  Paper,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Snackbar,
  FormControlLabel,
  Switch,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  PlayArrow as PlayIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import Alert from '@mui/material/Alert';

// Import useNavigate
import { useNavigate } from 'react-router-dom';
import useStreams from '../hooks/useStreams';
import useAuth from '../hooks/useAuth';
import StreamPlayer from '../components/streams/StreamPlayer';
import AddEditStreamDialog from '../components/streams/AddEditStreamDialog.js/StreamDialog';
import StreamDetailsDialog from '../components/streams/StreamDetailsDialog';

// Styled components using @emotion/styled
const Root = styled('div')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(2),
}));

const Header = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const StyledCardContent = styled(CardContent)(({ theme }) => ({
  flexGrow: 1,
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(1, 0),
}));

const PreviewDialog = styled(DialogContent)(({ theme }) => ({
  minWidth: 400,
  minHeight: 300,
}));

const NoStreamsMessage = styled(Paper)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(4),
}));

const LoadingContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '200px',
}));

const DeleteButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const PreviewPlayer = styled('div')(({ theme }) => ({
  width: '100%',
  height: '300px',
}));

const StreamManagement = () => {
  // Add navigate function
  const navigate = useNavigate();

  // Add a function to handle navigation to monitor
  const handleNavigateToMonitor = (streamId) => {
    console.log("Navigating to monitor with streamId:", streamId);
    // Make sure streamId is defined and valid
    if (!streamId) {
      console.error("Invalid streamId:", streamId);
      setNotification({
        open: true,
        message: "Cannot navigate to stream monitor: Invalid stream ID",
        severity: "error",
      });
      return;
    }
    // Navigate with the valid streamId
    navigate(`/streams/${streamId}/monitor`);
  };
  
  const { isOperator } = useAuth();
  const { streams, loading, error, addStream, editStream, removeStream } =
    useStreams();

  const [openDialog, setOpenDialog] = useState(false);
  const [currentStream, setCurrentStream] = useState(null);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [previewStream, setPreviewStream] = useState(null);
  const [openPreview, setOpenPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);

  // Handle dialog open for adding a stream
  const handleAddStream = () => {
    setCurrentStream(null);
    setDialogMode('add');
    setOpenDialog(true);
  };

  // Handle dialog open for editing a stream
  const handleEditStream = (stream) => {
    setCurrentStream(stream);
    setDialogMode('edit');
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setOpenDialog(false);
    setCurrentStream(null);
  };

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      if (dialogMode === 'add') {
        await addStream(values);
        resetForm();
        setNotification({
          open: true,
          message: 'Stream added successfully',
          severity: 'success',
        });
      } else {
        await editStream(currentStream._id, values);
        setNotification({
          open: true,
          message: 'Stream updated successfully',
          severity: 'success',
        });
      }
      handleDialogClose();
    } catch (err) {
      setNotification({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle stream deletion
  const handleDeleteStream = async (streamId) => {
    try {
      await removeStream(streamId);
      setDeleteConfirm(null);
      setNotification({
        open: true,
        message: 'Stream deleted successfully',
        severity: 'success',
      });
    } catch (err) {
      setNotification({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error',
      });
    }
  };

  // Handle preview stream
  const handlePreviewStream = (stream) => {
    setPreviewStream(stream);
    setOpenPreview(true);
  };

  // Handle close preview
  const handleClosePreview = () => {
    setOpenPreview(false);
    setPreviewStream(null);
  };

  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Get status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'primary';
      case 'inactive':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  // Open stream details dialog
  const handleOpenDetails = (stream) => {
    setSelectedStream(stream);
    setDetailsOpen(true);
  };

  // Close stream details dialog
  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedStream(null);
  };

  // Toggle stream status
  const handleToggleStreamStatus = async (stream) => {
    try {
      // Show a loading indicator or disable buttons during the operation
      setNotification({
        open: true,
        message: `Changing stream status...`,
        severity: 'info',
      });
  
      const newStatus = stream.status === 'active' ? 'inactive' : 'active';
      await editStream(stream._id, { ...stream, status: newStatus });
  
      setNotification({
        open: true,
        message: `Stream ${
          newStatus === 'active' ? 'activated' : 'deactivated'
        } successfully. ${newStatus === 'active' ? 'Recording started.' : 'Recording stopped.'}`,
        severity: 'success',
      });
    } catch (err) {
      setNotification({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error',
      });
    }
  };
  
  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress />
        <Typography variant="body1" sx={{ marginLeft: 2 }}>
          Loading streams...
        </Typography>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" color="error">
          Error: {error}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Paper>
    );
  }

  return (
    <Root>
      <Header>
        <Typography variant="h5" component="h1">
          Stream Management
        </Typography>
        {isOperator() && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddStream}
          >
            Add Stream
          </Button>
        )}
      </Header>

      {streams.length === 0 ? (
        <NoStreamsMessage>
          <Typography variant="h6">No streams available</Typography>
          <Typography variant="body1" color="text.secondary">
            {isOperator()
              ? 'Click the "Add Stream" button to create your first stream.'
              : 'No streams have been added yet.'}
          </Typography>
        </NoStreamsMessage>
      ) : (
        <Grid container spacing={3}>
          {streams.map((stream) => (
            <Grid item key={stream._id} xs={12} sm={6} md={6}>
              <StyledCard>
                <StyledCardContent>
                  <Typography variant="h6" component="h2">
                    {stream.name}
                  </Typography>

                  <StatusChip
                    label={stream.status}
                    color={getStatusColor(stream.status)}
                    size="small"
                  />

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="p"
                  >
                    {stream.description || 'No description provided'}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Location: {stream.location || 'N/A'}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Type: {stream.type.toUpperCase()}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" noWrap>
                    URL: {stream.url}
                  </Typography>
                </StyledCardContent>

                <CardActions>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 1 }}
                  >
                    <Button
                      size="small"
                      color="primary"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handlePreviewStream(stream)}
                    >
                      Preview
                    </Button>
                    <Button
                      size="small"
                      color="primary"
                      startIcon={<PlayIcon />}
                      onClick={() => handleNavigateToMonitor(stream._id)}
                    >
                      Monitor
                    </Button>
                    <Button
                      size="small"
                      color="primary"
                      startIcon={<SettingsIcon />}
                      onClick={() => handleOpenDetails(stream)}
                    >
                      Details
                    </Button>

                    {isOperator() && (
                      <>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={stream.status === 'active'}
                              onChange={() => handleToggleStreamStatus(stream)}
                              color="primary"
                            />
                          }
                          label={
                            stream.status === 'active' ? 'Active' : 'Inactive'
                          }
                        />

                        <Button
                          size="small"
                          color="primary"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditStream(stream)}
                        >
                          Edit
                        </Button>

                        <DeleteButton
                          size="small"
                          onClick={() => setDeleteConfirm(stream._id)}
                        >
                          <DeleteIcon />
                        </DeleteButton>
                      </>
                    )}
                  </Stack>
                </CardActions>
              </StyledCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Stream Details Dialog with Tabs */}
      <StreamDetailsDialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        stream={selectedStream}
        isOperator={isOperator()}
        onEdit={handleEditStream}
        onNavigateToMonitor={handleNavigateToMonitor}
        onToggleStatus={handleToggleStreamStatus}
      />

      {/* Add/Edit Stream Dialog */}
      <AddEditStreamDialog
        open={openDialog}
        onClose={handleDialogClose}
        onSubmit={handleSubmit}
        currentStream={currentStream}
        dialogMode={dialogMode}
      />

      {/* Stream Preview Dialog */}
      <Dialog
        open={openPreview}
        onClose={handleClosePreview}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{previewStream?.name} Preview</DialogTitle>
        <PreviewDialog>
          {previewStream && (
            <PreviewPlayer>
              <StreamPlayer stream={previewStream} />
            </PreviewPlayer>
          )}
        </PreviewDialog>
        <DialogActions>
          <Button onClick={handleClosePreview} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
      >
        <DialogTitle>Delete Stream</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this stream? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => handleDeleteStream(deleteConfirm)}
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Root>
  );
};

export default StreamManagement;
