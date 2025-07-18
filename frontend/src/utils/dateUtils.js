// client/src/utils/dateUtils.js
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';

/**
 * Format a date for display
 * @param {Date|string} date - The date to format
 * @param {string} formatStr - The format string to use
 * @returns {string} The formatted date string
 */
export const formatDate = (date, formatStr = 'MMM d, yyyy') => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Get the start of a day
 * @param {Date} date - The date
 * @returns {Date} The start of the day
 */
export const getStartOfDay = (date) => {
  return startOfDay(date);
};

/**
 * Get the end of a day
 * @param {Date} date - The date
 * @returns {Date} The end of the day
 */
export const getEndOfDay = (date) => {
  return endOfDay(date);
};

/**
 * Get a date range for "Last X days"
 * @param {number} days - Number of days to subtract
 * @returns {Object} Object with fromDate and toDate
 */
export const getLastDaysRange = (days) => {
  const toDate = new Date();
  const fromDate = subDays(toDate, days);
  
  return {
    fromDate: startOfDay(fromDate),
    toDate: endOfDay(toDate)
  };
};

/**
 * Get a date range for common presets
 * @param {string} preset - The preset name: 'today', 'yesterday', 'last7Days', 'last30Days'
 * @returns {Object} Object with fromDate and toDate
 */
export const getDateRangeForPreset = (preset) => {
  const today = new Date();
  
  switch (preset) {
    case 'today':
      return {
        fromDate: startOfDay(today),
        toDate: endOfDay(today)
      };
    case 'yesterday': {
      const yesterday = subDays(today, 1);
      return {
        fromDate: startOfDay(yesterday),
        toDate: endOfDay(yesterday)
      };
    }
    case 'last7Days':
      return getLastDaysRange(7);
    case 'last30Days':
      return getLastDaysRange(30);
    case 'last3Days':
      return getLastDaysRange(3);
    default:
      return {
        fromDate: null,
        toDate: null
      };
  }
};

/**
 * Format a date range for display
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @returns {string} Formatted date range
 */
export const formatDateRange = (fromDate, toDate) => {
  if (!fromDate && !toDate) return 'All time';
  if (fromDate && !toDate) return `Since ${formatDate(fromDate)}`;
  if (!fromDate && toDate) return `Until ${formatDate(toDate)}`;
  
  return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
};