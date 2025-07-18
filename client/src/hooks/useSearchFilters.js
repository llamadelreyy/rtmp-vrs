// client/src/hooks/useSearchFilters.js
import { useState, useCallback, useMemo } from 'react';
import { getDateRangeForPreset } from '../utils/dateUtils';

/**
 * Custom hook to manage search filters state and operations
 * @param {Object} initialFilters - Initial filter values
 * @returns {Object} Filter state and operations
 */
const useSearchFilters = (initialFilters = {}) => {
  // Wrap defaultFilters in useMemo to fix exhaustive-deps warning
  const defaultFilters = useMemo(() => ({
    query: '',
    streamId: '',
    fromDate: null,
    toDate: null,
    fromTime: null,
    toTime: null,
    ...initialFilters
  }), [initialFilters]);

  const [filters, setFilters] = useState(defaultFilters);
  const [datePreset, setDatePreset] = useState('');

  /**
   * Updates a specific filter value
   * @param {string} name - Filter name
   * @param {any} value - Filter value
   */
  const updateFilter = useCallback((name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  /**
   * Updates multiple filters at once
   * @param {Object} newFilters - Object containing new filter values
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  /**
   * Clears all filters to default values
   */
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setDatePreset('');
  }, [defaultFilters]);

  /**
   * Sets filters based on a date preset (today, yesterday, etc.)
   * @param {string} preset - Date preset identifier
   */
  const applyDatePreset = useCallback((preset) => {
    if (preset) {
      setDatePreset(preset);
      const { fromDate, toDate } = getDateRangeForPreset(preset);
      setFilters(prev => ({
        ...prev,
        fromDate,
        toDate,
        // Reset times when applying date preset
        fromTime: null,
        toTime: null
      }));
    }
  }, []);

  /**
   * Clears a specific filter
   * @param {string} name - Filter name to clear
   */
  const clearFilter = useCallback((name) => {
    setFilters(prev => ({
      ...prev,
      [name]: name === 'query' ? '' : null
    }));
  }, []);

  return {
    filters,
    datePreset,
    updateFilter,
    updateFilters,
    clearFilters,
    clearFilter,
    applyDatePreset,
    setDatePreset
  };
};

export default useSearchFilters;