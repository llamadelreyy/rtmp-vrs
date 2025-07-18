// client/src/api/streams.js
import api from './auth';
import { toast } from 'react-toastify';

// Get all streams
export const getStreams = async () => {
  try {
    const response = await api.get('/streams');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to fetch streams';
    toast.error(message);
    throw new Error(message);
  }
};

export const getStreamsByPredefinedEvent = async (event) => {
  try {
    // note: maxAge is in minutes
    const response = await api.get(
      `/streams/by-event/?event=${event}&maxAge=5`
    );

    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to fetch streams';
    toast.error(message);
    throw new Error(message);
  }
};

// Get a specific stream
export const getStream = async (id) => {
  try {
    const response = await api.get(`/streams/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to fetch stream';
    toast.error(message);
    throw new Error(message);
  }
};

// Create a new stream
export const createStream = async (streamData) => {
  try {
    const response = await api.post('/streams', streamData);
    toast.success('Stream created successfully');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to create stream';
    toast.error(message);
    throw new Error(message);
  }
};

// Update a stream
export const updateStream = async (id, streamData) => {
  try {
    const response = await api.put(`/streams/${id}`, streamData);
    toast.success('Stream updated successfully');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to update stream';
    toast.error(message);
    throw new Error(message);
  }
};

// Delete a stream
export const deleteStream = async (id) => {
  try {
    const response = await api.delete(`/streams/${id}`);
    toast.success('Stream deleted successfully');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to delete stream';
    toast.error(message);
    throw new Error(message);
  }
};

// Test a stream connection
export const testStream = async (streamData) => {
  try {
    const response = await api.post('/streams/test', streamData);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Stream test failed';
    toast.error(message);
    throw new Error(message);
  }
};

// Get all prompts for a stream
export const getStreamPrompts = async (streamId) => {
  try {
    const response = await api.get(`/streams/${streamId}/prompts`);
    return response.data;
  } catch (error) {
    // If the endpoint doesn't exist yet (404), return an empty array instead of throwing error
    if (error.response && error.response.status === 404) {
      console.warn(
        'Prompt endpoints not implemented yet. Returning empty array.'
      );
      return [];
    }

    const message = error.response?.data?.message || 'Failed to fetch prompts';
    toast.error(message);
    throw new Error(message);
  }
};

// Add a prompt to a stream
export const addStreamPrompt = async (streamId, promptData) => {
  try {
    const response = await api.post(`/streams/${streamId}/prompts`, promptData);
    toast.success('Prompt added successfully');
    return response.data;
  } catch (error) {
    // If the endpoint doesn't exist yet (404), return a mock response
    if (error.response && error.response.status === 404) {
      console.warn(
        'Prompt endpoints not implemented yet. Returning mock data.'
      );
      const mockPrompt = {
        _id: Date.now().toString(),
        streamId,
        ...promptData,
        createdAt: new Date().toISOString(),
      };
      return mockPrompt;
    }

    const message = error.response?.data?.message || 'Failed to add prompt';
    toast.error(message);
    throw new Error(message);
  }
};

// Update a prompt
export const updateStreamPrompt = async (streamId, promptId, promptData) => {
  try {
    const response = await api.put(
      `/streams/${streamId}/prompts/${promptId}`,
      promptData
    );
    toast.success('Prompt updated successfully');
    return response.data;
  } catch (error) {
    // If the endpoint doesn't exist yet (404), return a mock response
    if (error.response && error.response.status === 404) {
      console.warn(
        'Prompt endpoints not implemented yet. Returning updated data.'
      );
      return {
        _id: promptId,
        streamId,
        ...promptData,
        updatedAt: new Date().toISOString(),
      };
    }

    const message = error.response?.data?.message || 'Failed to update prompt';
    toast.error(message);
    throw new Error(message);
  }
};

// Delete a prompt
export const deleteStreamPrompt = async (streamId, promptId) => {
  try {
    const response = await api.delete(
      `/streams/${streamId}/prompts/${promptId}`
    );
    toast.success('Prompt deleted successfully');
    return response.data;
  } catch (error) {
    // If the endpoint doesn't exist yet (404), just return success
    if (error.response && error.response.status === 404) {
      console.warn(
        'Prompt endpoints not implemented yet. Mock deletion successful.'
      );
      return { success: true };
    }

    const message = error.response?.data?.message || 'Failed to delete prompt';
    toast.error(message);
    throw new Error(message);
  }
};
