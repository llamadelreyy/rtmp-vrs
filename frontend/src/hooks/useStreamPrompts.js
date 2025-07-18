// client/src/hooks/useStreamPrompts.js - Fixed version

import { useCallback, useState, useEffect, useRef } from 'react';
import { useStreamContext } from '../contexts/StreamContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const useStreamPrompts = (streamId) => {
  const {
    streamPrompts,
    promptsLoading,
    promptsError,
    fetchStreamPrompts,
    addPromptToStream,
    updatePrompt,
    removePrompt
  } = useStreamContext();
  
  const [activeThreads, setActiveThreads] = useState({});
  const [threadsError, setThreadsError] = useState(null);
  const hasFetchedRef = useRef(false);

  // Get prompts for this stream
  const prompts = streamPrompts[streamId] || [];
  const loading = promptsLoading[streamId] || false;
  
  // Fetch prompts for this stream
  const fetchPrompts = useCallback(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      return fetchStreamPrompts(streamId);
    }
    return Promise.resolve(prompts);
  }, [fetchStreamPrompts, streamId, prompts]);

  // Add a new prompt to this stream
  const addPrompt = useCallback((promptData) => {
    return addPromptToStream(streamId, promptData);
  }, [addPromptToStream, streamId]);

  // Update a prompt for this stream
  const editPrompt = useCallback((promptId, promptData) => {
    return updatePrompt(streamId, promptId, promptData);
  }, [updatePrompt, streamId]);

  // Delete a prompt from this stream
  const deletePrompt = useCallback((promptId) => {
    return removePrompt(streamId, promptId);
  }, [removePrompt, streamId]);
  
  // Start a thread with a prompt
  const startThread = useCallback((promptId, initialData = {}) => {
    const threadId = Date.now().toString();
    const prompt = prompts.find(p => p._id === promptId);
    
    setActiveThreads(prev => ({
      ...prev,
      [threadId]: { 
        promptId, 
        promptName: prompt?.name || 'Unknown Prompt',
        promptContent: prompt?.content || '',
        data: initialData, 
        messages: [],
        createdAt: new Date().toISOString()
      }
    }));
    return threadId;
  }, [prompts]);
  
  // Add message to a thread
  const addMessageToThread = useCallback((threadId, message) => {
    setActiveThreads(prev => {
      if (!prev[threadId]) return prev;
      return {
        ...prev,
        [threadId]: {
          ...prev[threadId],
          messages: [...prev[threadId].messages, {
            ...message,
            timestamp: new Date().toISOString()
          }]
        }
      };
    });
  }, []);
  
  // Close a thread
  const closeThread = useCallback((threadId) => {
    setActiveThreads(prev => {
      const newThreads = { ...prev };
      delete newThreads[threadId];
      return newThreads;
    });
  }, []);

  // Helper function to get auth token
  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }
    return token;
  }, []);

  // Fetch prompts on component mount if not already loaded
  useEffect(() => {
    // Only fetch once
    if (!hasFetchedRef.current && !loading && prompts.length === 0) {
      fetchPrompts().catch(err => {
        console.error('Error fetching prompts:', err);
      });
    }
  }, [fetchPrompts, loading, prompts.length]);

  // Start a continuous thread with a prompt
  const startContinuousThread = useCallback(async (promptId) => {
    setThreadsError(null);
    try {
      // Make sure the token is available
      const token = getAuthToken();
      
      const response = await fetch(`${API_URL}/vision/threads/${streamId}/${promptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update local state
      setActiveThreads(prev => ({
        ...prev,
        [data.threadId]: { 
          id: data.threadId,
          promptId, 
          promptName: prompts.find(p => p._id === promptId)?.name || 'Unknown Prompt',
          status: 'active',
          createdAt: new Date().toISOString()
        }
      }));
      
      return data.threadId;
    } catch (error) {
      console.error('Error starting thread:', error);
      setThreadsError(error.message);
      throw error;
    }
  }, [streamId, prompts, getAuthToken]);

  // Stop a thread
  const stopThread = useCallback(async (threadId) => {
    setThreadsError(null);
    try {
      // Make sure the token is available
      const token = getAuthToken();
      
      const response = await fetch(`${API_URL}/vision/threads/${threadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      
      // Update local state
      setActiveThreads(prev => {
        const newThreads = { ...prev };
        delete newThreads[threadId];
        return newThreads;
      });
      
      return true;
    } catch (error) {
      console.error('Error stopping thread:', error);
      setThreadsError(error.message);
      throw error;
    }
  }, [getAuthToken]);

  // Get thread status
  const fetchThreadsStatus = useCallback(async () => {
    try {
      console.log('Fetching thread status...');
      
      // Get token from localStorage
      const token = getAuthToken();
      
      // Call the actual endpoint, now with error handling
      console.log('Calling threads status endpoint...');
      const response = await fetch(`${API_URL}/vision/threads/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          // If JSON error, parse it
          const errorData = await response.json();
          throw new Error(errorData.message || `Status code ${response.status}`);
        } else {
          // If not JSON, log and throw generic error
          const text = await response.text();
          console.error('Non-JSON response:', text);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      //console.log('Thread status response:', data);
      
      // Convert server thread format to client format with better error handling
      if (data.threads && Array.isArray(data.threads)) {
        const updatedThreads = {};
        
        data.threads.forEach(thread => {
          // Better safeguards against missing properties
          if (thread && thread.id && thread.active) {
            const promptObj = prompts.find(p => p._id === thread.promptId);
            updatedThreads[thread.id] = {
              id: thread.id,
              promptId: thread.promptId,
              status: thread.active ? 'active' : 'inactive',
              promptName: promptObj ? promptObj.name : 'Unknown Prompt',
              lastProcessed: thread.lastProcessed,
              errorCount: thread.errorCount || 0
            };
          }
        });
        
        setActiveThreads(updatedThreads);
      }
      
      // Clear any previous errors since this worked
      setThreadsError(null);
      
      return data;
    } catch (error) {
      console.error('Error fetching thread status:', error);
      setThreadsError(error.message);
      // Return empty data with error information
      return { threads: [], error: error.message };
    }
  }, [getAuthToken, prompts]);

  // Fetch thread status periodically
  useEffect(() => {
    // Don't set up the interval if streamId is not defined
    if (!streamId) return;
    
    // Fetch thread status on mount
    fetchThreadsStatus().catch(err => {
      console.error('Initial thread status fetch error:', err);
    });
    
    // Set up interval to refresh thread status
    const interval = setInterval(() => {
      fetchThreadsStatus().catch(err => {
        console.error('Thread status refresh error:', err);
      });
    }, 15000); // Every 15 seconds
    
    return () => clearInterval(interval);
  }, [fetchThreadsStatus, streamId]);

  return {
    prompts,
    loading,
    error: promptsError,
    threadsError,
    fetchPrompts,
    addPrompt,
    editPrompt,
    deletePrompt,
    activeThreads,
    startThread,
    addMessageToThread,
    closeThread,
    startContinuousThread,
    stopThread,
    fetchThreadsStatus,
  };
};

export default useStreamPrompts;