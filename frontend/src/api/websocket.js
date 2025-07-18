// client/src/api/websocket.js
import io from 'socket.io-client';
import { toast } from 'react-toastify';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket;

export const initSocket = (token) => {
  // Close existing connection if any
  if (socket) {
    socket.close();
  }

  // Create new connection with authentication
  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
    toast.error('Connection to real-time services failed');
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);

    if (reason === 'io server disconnect') {
      // Server initiated the disconnect, try to reconnect
      socket.connect();
    }
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    if (token) {
      return initSocket(token);
    }
    throw new Error('No authentication token available');
  }
  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
};

// Subscribe to stream status updates
export const subscribeToStreamStatus = (callback) => {
  const socket = getSocket();
  socket.on('stream:status', callback);

  return () => {
    socket.off('stream:status', callback);
  };
};

// Subscribe to new stream events
export const subscribeToNewStreams = (callback) => {
  const socket = getSocket();
  socket.on('stream:new', callback);

  return () => {
    socket.off('stream:new', callback);
  };
};

export const subscribeToStreamEvents = (callback) => {
  const socket = getSocket();
  socket.on('stream:events', callback);

  return () => {
    socket.off('stream:events', callback);
  };
};

// Subscribe to stream deletion events
export const subscribeToStreamDeletion = (callback) => {
  const socket = getSocket();
  socket.on('stream:delete', callback);

  return () => {
    socket.off('stream:delete', callback);
  };
};

// Subscribe to stream update events
export const subscribeToStreamUpdates = (callback) => {
  const socket = getSocket();
  socket.on('stream:update', callback);

  return () => {
    socket.off('stream:update', callback);
  };
};
