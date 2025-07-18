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

// Layout
import MainLayout from './components/layout/MainLayout';

import { RecentEventsProvider } from './contexts/RecentEventsContext';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'dark', // Fix the deprecated 'type' to 'mode'
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#1e1e1e', // Lighter dark background (dark gray instead of almost black)
      paper: '#282828', // Lighter paper background
    },
    // You could also customize text colors for better contrast
    text: {
      primary: 'rgba(255, 255, 255, 0.9)',
      secondary: 'rgba(255, 255, 255, 0.7)',
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
                  <Route index element={<Navigate to="/dashboard" replace />} />

                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />

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
                    path="/vision/search"
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
