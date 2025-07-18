import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Tabs,
  Tab,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import { PREDEFINED_PROMPTS } from '../../../utils/predefined-prompts';

const PromptDialog = ({
  open,
  currentPrompt,
  formValues,
  handleClose,
  handleInputChange,
  handleSubmit,
}) => {
  const [activeTab, setActiveTab] = useState(
    currentPrompt ? 'custom' : 'predefined'
  );

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePredefinedPromptSelect = (promptName) => {
    const selectedPrompt = PREDEFINED_PROMPTS.find(
      (p) => p.name === promptName
    );

    if (selectedPrompt) {
      const nameEvent = {
        target: { name: 'name', value: selectedPrompt.name },
      };
      const descEvent = {
        target: { name: 'description', value: selectedPrompt.description },
      };
      const contentEvent = {
        target: { name: 'content', value: selectedPrompt.content },
      };

      handleInputChange(nameEvent);
      handleInputChange(descEvent);
      handleInputChange(contentEvent);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>
        {currentPrompt ? 'Edit Prompt' : 'Add New Prompt'}
      </DialogTitle>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="prompt tabs"
          textColor="secondary"
          indicatorColor="secondary"
        >
          <Tab label="Predefined" value="predefined" />
          <Tab label="Custom" value="custom" />
        </Tabs>
      </Box>
      <DialogContent>
        {activeTab === 'predefined' && (
          <FormControl fullWidth sx={{ my: 2 }}>
            <InputLabel id="predefined-prompt-label">
              Select a predefined prompt
            </InputLabel>
            <Select
              labelId="predefined-prompt-label"
              id="predefined-prompt-select"
              value={formValues.name}
              label="Select a predefined prompt"
              onChange={(e) => handlePredefinedPromptSelect(e.target.value)}
            >
              {PREDEFINED_PROMPTS.map((prompt) => (
                <MenuItem key={prompt.name} value={prompt.name}>
                  <Box>
                    <Typography variant="subtitle1">{prompt.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {prompt.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          autoFocus={activeTab === 'custom'}
          name="name"
          label="Prompt Name"
          fullWidth
          margin="dense"
          value={formValues.name}
          onChange={handleInputChange}
          disabled={activeTab === 'predefined'}
        />
        <TextField
          name="description"
          label="Description"
          fullWidth
          margin="dense"
          value={formValues.description}
          onChange={handleInputChange}
          disabled={activeTab === 'predefined'}
        />
        <TextField
          name="content"
          label="Prompt Content"
          fullWidth
          margin="dense"
          multiline
          rows={8}
          value={formValues.content}
          onChange={handleInputChange}
          helperText="Enter the custom instruction for the AI model"
          disabled={activeTab === 'predefined'}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={!formValues.name || !formValues.content}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PromptDialog;
