import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Stop as StopIcon } from '@mui/icons-material';

const ActiveThreadsList = ({ activeThreads, handleStopThread, threadLoading }) => {
  const threadsList = Object.values(activeThreads);

  if (threadsList.length === 0) {
    return <Typography color="textSecondary">No active threads</Typography>;
  }

  return (
    <List>
      {threadsList.map((thread) => (
        <ListItem key={thread.id}>
          <ListItemText
            primary={`Thread: ${thread.promptName}`}
            secondary={
              <>
                <Typography component="span" variant="body2">
                  Status: {thread.status || 'active'}
                </Typography>
                {thread.lastProcessed && (
                  <Typography component="p" variant="body2">
                    Last processed:{' '}
                    {new Date(thread.lastProcessed).toLocaleString()}
                  </Typography>
                )}
                {thread.errorCount > 0 && (
                  <Typography component="p" variant="body2" color="error">
                    Errors: {thread.errorCount}
                  </Typography>
                )}
              </>
            }
          />
          <ListItemSecondaryAction>
            <Tooltip title="Stop Thread">
              <IconButton
                edge="end"
                onClick={() => handleStopThread(thread.id)}
                disabled={threadLoading}
              >
                <StopIcon />
              </IconButton>
            </Tooltip>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};

export default ActiveThreadsList;
