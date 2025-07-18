import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import useStreamPrompts from '../../hooks/useStreamPrompts';
import ActiveThreadsList from './components/ActiveThreadsList';
import PromptsList from './components/PromptsList';
import PromptDialog from './components/PromptDialog';
import NotificationSnackbar from './components/NotificationSnackbar';

const StreamPrompts = ({ streamId, streamName }) => {
  const {
    prompts,
    loading,
    error,
    addPrompt,
    editPrompt,
    deletePrompt,
    activeThreads,
    startContinuousThread,
    stopThread,
    fetchThreadsStatus,
  } = useStreamPrompts(streamId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [formValues, setFormValues] = useState({
    name: '',
    content: '',
    description: '',
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [threadLoading, setThreadLoading] = useState(false);

  // Add a useEffect for error handling
  useEffect(() => {
    const loadThreadStatus = async () => {
      try {
        await fetchThreadsStatus();
      } catch (err) {
        console.error('Error fetching thread status:', err);
        setNotification({
          open: true,
          message: `Error fetching thread status: ${err.message}`,
          severity: 'error',
        });
      }
    };

    loadThreadStatus();
    const interval = setInterval(loadThreadStatus, 15000);

    return () => clearInterval(interval);
  }, [fetchThreadsStatus]);

  const handleOpenDialog = (prompt = null) => {
    if (prompt) {
      setCurrentPrompt(prompt);
      setFormValues({
        name: prompt.name,
        content: prompt.content,
        description: prompt.description || '',
      });
    } else {
      setCurrentPrompt(null);
      setFormValues({
        name: '',
        content: '',
        description: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentPrompt(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      if (currentPrompt) {
        await editPrompt(currentPrompt._id, formValues);
        setNotification({
          open: true,
          message: 'Prompt updated successfully',
          severity: 'success',
        });
      } else {
        await addPrompt(formValues);
        setNotification({
          open: true,
          message: 'Prompt added successfully',
          severity: 'success',
        });
      }
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving prompt:', err);
      setNotification({
        open: true,
        message: `Error: ${err.message || 'Failed to save prompt'}`,
        severity: 'error',
      });
    }
  };

  const handleDelete = async (promptId) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        await deletePrompt(promptId);
        setNotification({
          open: true,
          message: 'Prompt deleted successfully',
          severity: 'success',
        });
      } catch (err) {
        console.error('Error deleting prompt:', err);
        setNotification({
          open: true,
          message: `Error: ${err.message || 'Failed to delete prompt'}`,
          severity: 'error',
        });
      }
    }
  };

  const handleStartThread = async (promptId) => {
    setThreadLoading(true);
    try {
      // Check if this prompt already has an active thread
      const existingThread = Object.values(activeThreads).find(
        (t) => t.promptId === promptId && t.status === 'active'
      );

      if (existingThread) {
        setNotification({
          open: true,
          message: 'This prompt already has an active thread',
          severity: 'warning',
        });
        return;
      }

      await startContinuousThread(promptId);
      await fetchThreadsStatus(); // Refresh threads after starting
      setNotification({
        open: true,
        message: 'Thread started successfully',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error starting thread:', err);
      setNotification({
        open: true,
        message: `Error: ${err.message || 'Failed to start thread'}`,
        severity: 'error',
      });
    } finally {
      setThreadLoading(false);
    }
  };

  const handleStopThread = async (threadId) => {
    setThreadLoading(true);
    try {
      await stopThread(threadId);
      await fetchThreadsStatus(); // Refresh threads after stopping
      setNotification({
        open: true,
        message: 'Thread stopped successfully',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error stopping thread:', err);
      setNotification({
        open: true,
        message: `Error: ${err.message || 'Failed to stop thread'}`,
        severity: 'error',
      });
    } finally {
      setThreadLoading(false);
    }
  };

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box my={2}>
        <Typography color="error">Error loading prompts: {error}</Typography>
      </Box>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            Active Threads
          </Typography>
          <ActiveThreadsList 
            activeThreads={activeThreads} 
            handleStopThread={handleStopThread}
            threadLoading={threadLoading}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">Custom Prompts for: {streamName}</Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            color="primary"
            onClick={() => handleOpenDialog()}
          >
            Add Prompt
          </Button>
        </Box>

        <PromptsList 
          prompts={prompts}
          activeThreads={activeThreads}
          handleOpenDialog={handleOpenDialog}
          handleDelete={handleDelete}
          handleStartThread={handleStartThread}
          threadLoading={threadLoading}
        />

        <PromptDialog
          open={dialogOpen}
          currentPrompt={currentPrompt}
          formValues={formValues}
          handleClose={handleCloseDialog}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
        />

        <NotificationSnackbar 
          notification={notification}
          closeNotification={closeNotification}
        />
      </CardContent>
    </Card>
  );
};

export default StreamPrompts;
