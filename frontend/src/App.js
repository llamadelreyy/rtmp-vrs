// client/src/App.js
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context providers
import { AuthProvider } from './contexts/AuthContext';
import { StreamProvider } from './contexts/StreamContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

// Routes
import PrivateRoute from './components/common/PrivateRoute';
import AdminRoute from './components/common/AdminRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StreamManagement from './pages/StreamManagement';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

import RecordingViewer from './pages/RecordingViewer';
import StreamMonitor from './components/streams/StreamMonitor';
import VisionSearch from './pages/VisionSearch';

// New Feature Pages
import LiveDescriptions from './pages/LiveDescriptions';
import StoredVideos from './pages/StoredVideos';
import EventSearch from './pages/EventSearch';
import AlarmTriggers from './pages/AlarmTriggers';
import BehaviorDetection from './pages/BehaviorDetection';
import Reports from './pages/Reports';

// Layout
import MainLayout from './components/layout/MainLayout';

import { RecentEventsProvider } from './contexts/RecentEventsContext';

// Create professional security theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3b82f6',
      dark: '#2563eb',
      light: '#60a5fa',
    },
    secondary: {
      main: '#8b5cf6',
      dark: '#7c3aed',
      light: '#a78bfa',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.04em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h3: {
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #f3f4f6',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <WebSocketProvider>
        <RecentEventsProvider>
          <StreamProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/" element={<MainLayout />}>
                  <Route index element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } />

                  <Route
                    path="/streams"
                    element={
                      <PrivateRoute>
                        <StreamManagement />
                      </PrivateRoute>
                    }
                  />

                  <Route
                    path="/streams/:streamId/monitor"
                    element={
                      <PrivateRoute>
                        <StreamMonitor />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/vision-search"
                    element={
                      <PrivateRoute>
                        <VisionSearch />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/recordings/:streamId"
                    element={
                      <PrivateRoute>
                        <RecordingViewer />
                      </PrivateRoute>
                    }
                  />

                  {/* New Feature Routes */}
                  <Route
                    path="/live-descriptions"
                    element={
                      <PrivateRoute>
                        <LiveDescriptions />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/stored-videos"
                    element={
                      <PrivateRoute>
                        <StoredVideos />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/event-search"
                    element={
                      <PrivateRoute>
                        <EventSearch />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/alarm-triggers"
                    element={
                      <PrivateRoute>
                        <AlarmTriggers />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/behavior-detection"
                    element={
                      <PrivateRoute>
                        <BehaviorDetection />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <PrivateRoute>
                        <Reports />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <AdminRoute>
                        <UserManagement />
                      </AdminRoute>
                    }
                  />

                  <Route
                    path="/profile"
                    element={
                      <PrivateRoute>
                        <Profile />
                      </PrivateRoute>
                    }
                  />

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Router>
            <ToastContainer position="top-right" autoClose={5000} />
          </StreamProvider>
          </RecentEventsProvider>
        </WebSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
