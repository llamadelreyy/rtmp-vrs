// client/src/hooks/useVisionResults.js
import { useState, useCallback, useEffect } from 'react';
import api from '../api/auth';

const useVisionResults = (streamId, promptId = null, autoFetch = true) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  const fetchResults = useCallback(async (pageNum = page, limitNum = limit) => {
    if (!streamId) return;

    try {
      setLoading(true);
      setError(null);

      let url = `/vision/streams/${streamId}/results?page=${pageNum}&limit=${limitNum}`;

      if (promptId) {
        url += `&promptId=${promptId}`;
      }

      const response = await api.get(url);

      setResults(response.data.docs || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalResults(response.data.totalDocs || 0);

      return response.data;
    } catch (err) {
      console.error('Error fetching vision results:', err);
      setError(err.response?.data?.message || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [streamId, promptId, page, limit]);

  // Use effect to fetch data only once on mount or when dependencies change
  useEffect(() => {
    if (autoFetch && streamId) {
      fetchResults();
    }
    // The streamId or promptId changing should trigger a refetch
  }, [streamId, promptId, autoFetch, fetchResults]);


  const processFrame = useCallback(async (promptIdToUse = promptId) => {
    if (!streamId || !promptIdToUse) {
      throw new Error('Stream ID and Prompt ID are required');
    }

    try {
      setLoading(true);

      // Modified API call - no image data sent, just trigger processing
      const response = await api.post(
        `/vision/streams/${streamId}/prompts/${promptIdToUse}/process`,
        { forceProcess: true }  // We can keep this option
      );

      // Refresh results after processing
      await fetchResults(1, limit);

      return response.data;
    } catch (err) {
      console.error('Error processing frame:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [streamId, promptId, limit, fetchResults]);

  const searchResults = useCallback(async (searchQuery, options = {}) => {
    try {
      setLoading(true);
      setError(null);
  
      const params = new URLSearchParams();
  
      // Add search query if provided
      if (searchQuery) params.append('query', searchQuery);
  
      // Add optional filters when provided
      if (options.streamId) params.append('streamId', options.streamId);
  
      // Handle date filters with proper formatting
      if (options.fromDate) {
        const fromDate = typeof options.fromDate === 'string'
          ? options.fromDate
          : options.fromDate.toISOString();
        params.append('fromDate', fromDate);
      }
  
      if (options.toDate) {
        const toDate = typeof options.toDate === 'string'
          ? options.toDate
          : options.toDate.toISOString();
        params.append('toDate', toDate);
      }
  
      // Add pagination parameters
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
  
      // Add event type filters if provided
      if (options.eventType) params.append('eventType', options.eventType);
  
      // Improved semantic search parameters
      params.append('useEmbedding', options.useEmbedding !== false); // Default to true
      
      // Allow configurable similarity threshold (default to 0.6 for better results)
      params.append('similarity', options.similarity || 0.001);
      
      // Option to prioritize certain result types
      if (options.prioritize) params.append('prioritize', options.prioritize);
  
      const url = `/vision/search?${params.toString()}`;
  
      const response = await api.get(url);
  
      // Return more metadata about the search results
      return {
        results: response.data.docs || [],
        totalPages: response.data.totalPages || 1,
        totalResults: response.data.totalDocs || 0,
        page: response.data.page || 1,
        hasNextPage: response.data.hasNextPage || false,
        hasPrevPage: response.data.hasPrevPage || false,
        searchMethod: response.data.searchMethod || 'text',
        averageSimilarity: response.data.averageSimilarity,
        executionTime: response.data.executionTime
      };
    } catch (err) {
      console.error('Error searching vision results:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a method to generate embeddings (for testing/debugging)
  const generateEmbedding = useCallback(async (text) => {
    try {
      setLoading(true);
      const response = await api.post('/vision/embedding', { text });
      return response.data;
    } catch (err) {
      console.error('Error generating embedding:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  const changePage = useCallback((newPage) => {
    setPage(newPage);
    fetchResults(newPage, limit);
  }, [limit, fetchResults]);

  const changeLimit = useCallback((newLimit) => {
    setLimit(newLimit);
    // When changing limit, go back to first page
    setPage(1);
    fetchResults(1, newLimit);
  }, [fetchResults]);

  // Add a new method to trigger backfilling of embeddings
  const backfillEmbeddings = useCallback(async (batchSize = 50) => {
    try {
      setLoading(true);
      const response = await api.post(`/vision/backfill-embeddings?batchSize=${batchSize}`);
      return response.data;
    } catch (err) {
      console.error('Error backfilling embeddings:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    results,
    loading,
    error,
    totalPages,
    totalResults,
    currentPage: page,
    limit,
    fetchResults,
    processFrame,
    searchResults,
    changePage,
    changeLimit,
    generateEmbedding,   // Add new method
    backfillEmbeddings   // Add new method
  };
};

export default useVisionResults;