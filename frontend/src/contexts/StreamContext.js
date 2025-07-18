// client/src/contexts/StreamContext.js
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import useStreams from '../hooks/useStreams';
import { getStreamPrompts, addStreamPrompt, updateStreamPrompt, deleteStreamPrompt } from '../api/streams';
import useAuth from '../hooks/useAuth';

const StreamContext = createContext();

// Helper for localStorage persistence
const getLocalPrompts = () => {
  try {
    const storedPrompts = localStorage.getItem('streamPrompts');
    return storedPrompts ? JSON.parse(storedPrompts) : {};
  } catch (e) {
    console.error('Error reading prompts from localStorage:', e);
    return {};
  }
};

const saveLocalPrompts = (prompts) => {
  try {
    localStorage.setItem('streamPrompts', JSON.stringify(prompts));
  } catch (e) {
    console.error('Error saving prompts to localStorage:', e);
  }
};

export const StreamProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  const { 
    streams, 
    loading, 
    error, 
    fetchStreams, 
    addStream, 
    editStream, 
    removeStream 
  } = useStreams();
  
  // Initialize from localStorage for temp storage
  const [streamPrompts, setStreamPrompts] = useState(getLocalPrompts);
  const [promptsLoading, setPromptsLoading] = useState({});
  const [promptsError, setPromptsError] = useState(null);
  
  // Use a ref to track which streams we've already fetched prompts for
  const fetchedPromptsRef = useRef({});

  // Save to localStorage when prompts change
  useEffect(() => {
    if (Object.keys(streamPrompts).length > 0) {
      saveLocalPrompts(streamPrompts);
    }
  }, [streamPrompts]);

  // Fetch prompts for a specific stream - wrap in useCallback to prevent unnecessary re-renders
  const fetchStreamPrompts = useCallback(async (streamId) => {
    // Don't attempt to fetch if not authenticated
    if (!isAuthenticated()) return [];
    
    // Don't attempt to fetch if already loading for this stream
    if (promptsLoading[streamId]) return streamPrompts[streamId] || [];
    
    try {
      setPromptsLoading(prev => ({ ...prev, [streamId]: true }));
      
      // Mark this stream as having had its prompts fetched
      fetchedPromptsRef.current[streamId] = true;
      
      const prompts = await getStreamPrompts(streamId);
      
      // Use a function to update state to avoid stale closures
      setStreamPrompts(prev => {
        // Only update if the prompts are different to avoid unnecessary re-renders
        if (JSON.stringify(prev[streamId]) !== JSON.stringify(prompts)) {
          return { ...prev, [streamId]: prompts };
        }
        return prev;
      });
      
      return prompts;
    } catch (err) {
      console.error('Error fetching prompts:', err);
      setPromptsError(err.message);
      return [];
    } finally {
      setPromptsLoading(prev => ({ ...prev, [streamId]: false }));
    }
  }, [isAuthenticated, promptsLoading, streamPrompts]);

  // Add a custom prompt to a stream
  const addPromptToStream = async (streamId, promptData) => {
    // Don't attempt to add if not authenticated
    if (!isAuthenticated()) return null;
    
    try {
      const newPrompt = await addStreamPrompt(streamId, promptData);
      setStreamPrompts(prev => {
        const updated = {
          ...prev,
          [streamId]: [...(prev[streamId] || []), newPrompt]
        };
        return updated;
      });
      return newPrompt;
    } catch (err) {
      console.error('Error adding prompt:', err);
      setPromptsError(err.message);
      return null;
    }
  };

  // Update a custom prompt
  const updatePrompt = async (streamId, promptId, promptData) => {
    // Don't attempt to update if not authenticated
    if (!isAuthenticated()) return null;
    
    try {
      const updatedPrompt = await updateStreamPrompt(streamId, promptId, promptData);
      setStreamPrompts(prev => {
        const updated = {
          ...prev,
          [streamId]: prev[streamId]?.map(prompt => 
            prompt._id === promptId ? updatedPrompt : prompt
          ) || []
        };
        return updated;
      });
      return updatedPrompt;
    } catch (err) {
      console.error('Error updating prompt:', err);
      setPromptsError(err.message);
      return null;
    }
  };

  // Remove a custom prompt
  const removePrompt = async (streamId, promptId) => {
    // Don't attempt to remove if not authenticated
    if (!isAuthenticated()) return;
    
    try {
      await deleteStreamPrompt(streamId, promptId);
      setStreamPrompts(prev => {
        const updated = {
          ...prev,
          [streamId]: prev[streamId]?.filter(prompt => prompt._id !== promptId) || []
        };
        return updated;
      });
    } catch (err) {
      console.error('Error removing prompt:', err);
      setPromptsError(err.message);
    }
  };

  // Load prompts for all streams when streams change
  useEffect(() => {
    // Only fetch streams if user is authenticated and auth loading is complete
    if (isAuthenticated() && !authLoading && streams.length > 0 && !loading) {
      streams.forEach(stream => {
        // Only fetch prompts for streams we haven't fetched yet
        if (!fetchedPromptsRef.current[stream._id]) {
          fetchStreamPrompts(stream._id);
        }
      });
    }
  }, [streams, loading, isAuthenticated, authLoading, fetchStreamPrompts]);

  return (
    <StreamContext.Provider value={{
      streams,
      loading: loading || authLoading, // Include auth loading state
      error,
      fetchStreams,
      addStream,
      editStream,
      removeStream,
      streamPrompts,
      promptsLoading,
      promptsError,
      fetchStreamPrompts,
      addPromptToStream,
      updatePrompt,
      removePrompt
    }}>
      {children}
    </StreamContext.Provider>
  );
};

export const useStreamContext = () => useContext(StreamContext);

export default StreamContext;