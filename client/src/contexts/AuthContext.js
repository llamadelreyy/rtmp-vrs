// client/src/contexts/AuthContext.js - Fixed version

import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { login, logout, checkAuth } from '../api/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      // Check if we already have auth data in localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        setAuthChecked(true);
        setLoading(false);
        return;
      }
      
      // Validate token first to avoid unnecessary API calls
      try {
        if (!isTokenValid(token)) {
          localStorage.removeItem('token');
          setAuthChecked(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Token validation error:', err);
        localStorage.removeItem('token');
        setAuthChecked(true);
        setLoading(false);
        return;
      }
      
      try {
        const userData = await checkAuth();
        if (userData && userData.role) {
          setCurrentUser(userData);
          setUserRole(userData.role);
        } else {
          // If we get a response but no role, handle this case
          console.warn('User data has no role property', userData);
          setCurrentUser(null);
          setUserRole(null);
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
        setCurrentUser(null);
        setUserRole(null);
        localStorage.removeItem('token');
      } finally {
        setAuthChecked(true);
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Function to check if token is valid with better error handling
  const isTokenValid = (token) => {
    if (!token) return false;
    
    try {
      const decoded = jwtDecode(token);
      
      // Check if decoded token has expected properties
      if (!decoded || typeof decoded !== 'object') {
        console.error('Invalid token format: decoded token is not an object');
        return false;
      }
      
      // Check for exp claim
      if (!decoded.exp) {
        console.error('Invalid token: no expiration claim');
        return false;
      }
      
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch (err) {
      console.error('Token validation error:', err);
      return false;
    }
  };

  // Add function to clear auth errors
  const clearAuthError = () => {
    setError(null);
  };

  const loginUser = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      const { token, user } = await login(credentials);
      
      // Validate received data
      if (!token || !user) {
        throw new Error('Invalid response from login API');
      }
      
      // Verify the user has a role
      if (!user.role) {
        console.error('User object is missing role property:', user);
        throw new Error('User role not defined');
      }
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      // Set user in state
      setCurrentUser(user);
      setUserRole(user.role);
      
      return user;
    } catch (err) {
      setError(err.message || 'Failed to login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    try {
      setLoading(true);
      
      // Attempt to call logout API, but don't block on failure
      try {
        await logout();
      } catch (logoutErr) {
        console.warn('Logout API call failed, continuing anyway:', logoutErr);
      }
      
      // Always remove token and clear user state
      localStorage.removeItem('token');
      setCurrentUser(null);
      setUserRole(null);
    } catch (err) {
      setError(err.message || 'Failed to logout');
      // Still remove token even on error
      localStorage.removeItem('token');
      setCurrentUser(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  // Safely check roles with null checks
  const isAdmin = () => userRole === 'admin';
  const isOperator = () => userRole === 'operator' || userRole === 'admin';
  const isAuthenticated = () => !!currentUser && !!userRole;

  const value = {
    currentUser,
    userRole,
    loading,
    error,
    loginUser,
    logoutUser,
    isAdmin,
    isOperator,
    isAuthenticated,
    isTokenValid: () => isTokenValid(localStorage.getItem('token')),
    clearAuthError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;