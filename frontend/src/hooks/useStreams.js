// client/src/hooks/useStreams.js - Modified version
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getStreams,
  createStream,
  updateStream,
  deleteStream,
  getStreamsByPredefinedEvent,
} from '../api/streams';
import {
  subscribeToStreamStatus,
  subscribeToNewStreams,
  subscribeToStreamDeletion,
  subscribeToStreamUpdates,
  subscribeToStreamEvents,
} from '../api/websocket';
import useAuth from './useAuth';

const useStreams = () => {
  const { isAuthenticated } = useAuth();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Add a reference to track if we've already attempted to fetch streams
  const initialFetchAttempted = useRef(false);

  // Fetch all streams
  const fetchStreams = useCallback(async () => {
    // Don't attempt to fetch if not authenticated
    if (!isAuthenticated()) {
      setLoading(false);
      return [];
    }

    try {
      setLoading(true);
      const data = await getStreams();
      setStreams(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching streams:', err);
      return [];
    } finally {
      setLoading(false);
      // Mark that we've attempted to fetch streams
      initialFetchAttempted.current = true;
    }
  }, [isAuthenticated]);

  const fetchStreamsByPredefinedEvent = useCallback(
    async (event) => {
      if (!isAuthenticated()) {
        setLoading(false);
        return [];
      }
      try {
        setLoading(true);
        const data = await getStreamsByPredefinedEvent(event);
        setStreams(data);
        setError(null);
        return data;
      } catch (err) {
        setError(err.message);
        console.error('Error fetching streams:', err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated]
  );

  // Add new stream
  const addStream = useCallback(
    async (streamData) => {
      if (!isAuthenticated()) return null;

      try {
        const newStream = await createStream(streamData);
        setStreams((prev) => [...prev, newStream]);
        return newStream;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [isAuthenticated]
  );

  // Edit stream
  const editStream = useCallback(
    async (id, streamData) => {
      if (!isAuthenticated()) return null;

      try {
        const updatedStream = await updateStream(id, streamData);
        setStreams((prev) =>
          prev.map((stream) => (stream._id === id ? updatedStream : stream))
        );
        return updatedStream;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [isAuthenticated]
  );

  // Remove stream
  const removeStream = useCallback(
    async (id) => {
      if (!isAuthenticated()) return;

      try {
        await deleteStream(id);
        setStreams((prev) => prev.filter((stream) => stream._id !== id));
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [isAuthenticated]
  );

  // Remove the problematic effect that was causing the infinite loop
  // We'll handle initial fetching in the effect below

  // Setup WebSocket subscriptions and handle initial fetch
  useEffect(() => {
    // Only setup WebSocket and fetch streams if authenticated
    if (!isAuthenticated()) {
      setLoading(false);
      return () => {};
    }

    // Initial fetch - only if we haven't already attempted it
    if (!initialFetchAttempted.current) {
      console.log("Initial stream fetch");
      fetchStreams();
    }

    // Subscribe to stream status updates
    const unsubscribeStatus = subscribeToStreamStatus((data) => {
      console.log('Stream status update received:', data);
      setStreams((prev) =>
        prev.map((stream) =>
          stream._id === data.streamId
            ? { ...stream, status: data.status }
            : stream
        )
      );
    });

    // Subscribe to new streams
    const unsubscribeNew = subscribeToNewStreams((stream) => {
      setStreams((prev) => [...prev, stream]);
    });

    // Subscribe to stream deletions
    const unsubscribeDelete = subscribeToStreamDeletion((streamId) => {
      setStreams((prev) => prev.filter((stream) => stream._id !== streamId));
    });

    // Subscribe to stream updates
    const unsubscribeUpdate = subscribeToStreamUpdates((updatedStream) => {
      setStreams((prev) =>
        prev.map((stream) =>
          stream._id === updatedStream._id ? updatedStream : stream
        )
      );
    });

    // subscribe to stream events
    const unsubscribeEvents = subscribeToStreamEvents((event) => {
      console.log('Stream event received:', event);
      // Handle stream events as needed
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeStatus();
      unsubscribeNew();
      unsubscribeDelete();
      unsubscribeUpdate();
      unsubscribeEvents();
    };
  }, [fetchStreams, isAuthenticated]);

  return {
    streams,
    loading,
    error,
    fetchStreams,
    addStream,
    editStream,
    removeStream,
    fetchStreamsByPredefinedEvent,
  };
};

export default useStreams;