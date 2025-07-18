import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocketContext } from './WebSocketContext';
import api from '../api/auth';
import useAuth from '../hooks/useAuth';

const RecentEventsContext = createContext();

export const useRecentEvents = () => useContext(RecentEventsContext);

export const RecentEventsProvider = ({ children }) => {
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const { socket } = useWebSocketContext();
  const { isAuthenticated } = useAuth();
  
  // Maximum number of recent events to keep
  const MAX_RECENT_EVENTS = 20;
  
  // How long to keep events in the recent list (in milliseconds)
  const EVENT_RETENTION_PERIOD = 24 * 60 * 60 * 1000; // 24 hours
  
// Add a new event to the recent events list
  const addRecentEvent = (event) => {
    setRecentEvents(prevEvents => {
      // Ensure streamId is a string
      const streamIdValue = typeof event.streamId === 'object' ? 
        (event.streamId._id || event.streamId.id || JSON.stringify(event.streamId)) : 
        event.streamId;
      
      // Create a new event with a unique ID and timestamp
      const newEvent = {
        ...event,
        streamId: streamIdValue, // Use the string value
        id: `${event.type}-${streamIdValue}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        viewed: false
      };
      
      // Add to beginning of array and limit size
      const updatedEvents = [newEvent, ...prevEvents].slice(0, MAX_RECENT_EVENTS);
      return updatedEvents;
    });
  };
  
  
  // Mark an event as viewed
  const markEventAsViewed = (eventId) => {
    setRecentEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId ? { ...event, viewed: true } : event
      )
    );
  };
  
  // Clear all recent events
  const clearRecentEvents = () => {
    setRecentEvents([]);
  };
  
  // Fetch recent events from the API
  const fetchRecentEvents = async () => {
    if (!isAuthenticated()) {
      console.log('Skipping recent events fetch - not authenticated');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching recent events from API');
      
      // Calculate time range for recent events (last 24 hours)
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - EVENT_RETENTION_PERIOD);
      
      // Use the vision search API to get recent events
      const response = await api.get('/vision/search', {
        params: {
          fromDate: oneDayAgo.toISOString(),
          toDate: now.toISOString(),
          limit: MAX_RECENT_EVENTS,
          sort: '-timestamp' // Sort by timestamp descending (most recent first)
        }
      });
      
      console.log('Received recent events from API:', response.data);
      
      // Transform API results to our event format
      if (response.data.docs && response.data.docs.length > 0) {
        const apiEvents = response.data.docs.map(result => {
            // Ensure streamId is a string
            const streamIdValue = typeof result.streamId === 'object' ? 
              (result.streamId._id || result.streamId.id || JSON.stringify(result.streamId)) : 
              result.streamId;
            
            return {
              type: result.eventType || result.promptName || 'Detection',
              streamId: streamIdValue, // Use the string value
              streamName: result.streamName || 'Unknown Stream',
              detectionTime: result.timestamp || result.createdAt,
              imageUrl: result.imageUrl || null,
              id: `api-${result._id}`,
              timestamp: result.timestamp || result.createdAt,
              viewed: false
            };
          });
        
        setRecentEvents(apiEvents);
      }
    } catch (error) {
      console.error('Error fetching recent events:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch events when component mounts
  useEffect(() => {
    // Only set up fetching if authenticated
    if (isAuthenticated()) {
      // Fetch events initially
      fetchRecentEvents();
      
      // Set up a refresh interval (every 5 seconds)
      const refreshInterval = setInterval(() => {
        console.log('Refreshing recent events');
        fetchRecentEvents();
      }, 5 * 1000); // 5 seconds
      
      return () => clearInterval(refreshInterval);
    }
  }, [isAuthenticated]); // Add isAuthenticated as a dependency
  
  // Listen for new events from WebSocket
  useEffect(() => {
    if (!socket) {
      console.log('Socket not available in RecentEventsContext');
      return;
    }
    
    console.log('Setting up event_detection listener in RecentEventsContext');
    
    const handleEventDetection = (data) => {
      console.log('Event detection received:', data);
      // When an event is detected, add it to recent events
      if (data.eventType && data.streamId) {
        console.log('Adding event to recent events:', {
          type: data.eventType,
          streamId: data.streamId,
          streamName: data.streamName || 'Unknown Stream'
        });
        
        addRecentEvent({
          type: data.eventType,
          streamId: data.streamId,
          streamName: data.streamName || 'Unknown Stream',
          detectionTime: data.timestamp || new Date().toISOString(),
          imageUrl: data.imageUrl || null
        });
      } else {
        console.log('Incomplete event data, not adding to recent events');
      }
    };
    
    socket.on('event_detection', handleEventDetection);
    
    return () => {
      console.log('Removing event_detection listener');
      socket.off('event_detection', handleEventDetection);
    };
  }, [socket]);
  
  // Clean up old events periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const cutoffTime = new Date(Date.now() - EVENT_RETENTION_PERIOD);
      
      setRecentEvents(prevEvents => 
        prevEvents.filter(event => 
          new Date(event.timestamp) > cutoffTime
        )
      );
    }, 60 * 60 * 1000); // Check every hour
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  return (
    <RecentEventsContext.Provider value={{
      recentEvents,
      loading,
      addRecentEvent,
      markEventAsViewed,
      clearRecentEvents,
      fetchRecentEvents
    }}>
      {children}
    </RecentEventsContext.Provider>
  );
};
