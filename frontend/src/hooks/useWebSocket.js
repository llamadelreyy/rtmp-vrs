// client/src/hooks/useWebSocket.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { initSocket, closeSocket } from '../api/websocket';
import useAuth from './useAuth';

const useWebSocket = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // Initialize WebSocket connection
  const connect = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const socket = initSocket(token);
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        setError(null);
      });

      socket.on('connect_error', (err) => {
        setConnected(false);
        setError(`Connection error: ${err.message}`);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      return socket;
    } catch (err) {
      setError(err.message);
      setConnected(false);
      return null;
    }
  }, []);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    closeSocket();
    socketRef.current = null;
    setConnected(false);
  }, []);

  // Send a message via WebSocket
  const send = useCallback((event, data) => {
    try {
      if (!socketRef.current) {
        throw new Error('WebSocket not connected');
      }

      socketRef.current.emit(event, data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Subscribe to a WebSocket event
  const subscribe = useCallback((event, callback) => {
    try {
      if (!socketRef.current) {
        throw new Error('WebSocket not connected');
      }

      socketRef.current.on(event, callback);

      return () => {
        if (socketRef.current) {
          socketRef.current.off(event, callback);
        }
      };
    } catch (err) {
      setError(err.message);
      return () => {};
    }
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser && !socketRef.current) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, currentUser, connect, disconnect]);

  return {
    connected: socketRef.current?.connected ?? false,
    error,
    connect,
    disconnect,
    send,
    subscribe,
    socket: socketRef.current,
  };
};

export default useWebSocket;
