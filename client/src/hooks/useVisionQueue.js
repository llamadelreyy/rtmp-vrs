// client/src/hooks/useVisionQueue.js
import { useState, useCallback } from 'react';
import api from '../api/auth'; // Import the api instance with interceptors

const useVisionQueue = () => {
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchQueueStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the correct path - remove the /api prefix since it's in the baseURL
      const response = await api.get('/vision/queue');
      
      setQueueStatus(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching queue status:', err);
      setError(err.response?.data?.message || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    queueStatus,
    loading,
    error,
    fetchQueueStatus
  };
};

export default useVisionQueue;