import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
} from '@mui/icons-material';

const PromptsList = ({
  prompts,
  activeThreads,
  handleOpenDialog,
  handleDelete,
  handleStartThread,
  threadLoading,
}) => {
  if (prompts.length === 0) {
    return (
      <Typography color="textSecondary">
        No custom prompts added yet.
      </Typography>
    );
  }

  return (
    <List>
      {prompts.map((prompt, index) => (
        <React.Fragment key={prompt._id}>
          {index > 0 && <Divider />}
          <ListItem>
            <ListItemText
              primary={prompt.name}
              secondary={
                <>
                  <Typography
                    component="span"
                    variant="body2"
                    color="textPrimary"
                  >
                    {prompt.description}
                  </Typography>
                  <Typography
                    component="p"
                    variant="body2"
                    noWrap
                    sx={{ maxWidth: 400 }}
                  >
                    {prompt.content}
                  </Typography>
                </>
              }
            />
            <ListItemSecondaryAction>
              <Tooltip title="Start Thread">
                <IconButton
                  edge="end"
                  onClick={() => handleStartThread(prompt._id)}
                  sx={{ mr: 1 }}
                  disabled={
                    threadLoading ||
                    Object.values(activeThreads).some(
                      (t) => t.promptId === prompt._id && t.status === 'active'
                    )
                  }
                >
                  <StartIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit">
                <IconButton
                  edge="end"
                  onClick={() => handleOpenDialog(prompt)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton edge="end" onClick={() => handleDelete(prompt._id)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        </React.Fragment>
      ))}
    </List>
  );
};

export default PromptsList;
