// client/src/components/streams/HlsStreamViewer.js
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import {
  Box,
  Typography,
  Button,
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PlayerContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  backgroundColor: '#000',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

const VideoElement = styled('video')({
  width: '100%',
  height: 'auto',
  maxHeight: '70vh',
});

const StatusOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  zIndex: 10,
}));

const HlsStreamViewer = ({ streamId, streamUrl, recordingFolder }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState('waiting');
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  // Determine if we're viewing a historical recording based on whether recordingFolder is provided
  const isHistorical = useMemo(() => Boolean(recordingFolder), [recordingFolder]);

  // Memoize the stream URL and ID to prevent unnecessary re-initializations
  const memoizedStreamUrl = useMemo(() => streamUrl, [streamUrl]);
  const memoizedStreamId = useMemo(() => streamId, [streamId]);
  const memoizedRecordingFolder = useMemo(() => recordingFolder, [recordingFolder]);

  // Cleanup function to properly destroy Hls instance
  const cleanupHls = useCallback(() => {
    if (hlsRef.current) {
      try {
        console.log('Cleaning up HLS instance');
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (e) {
        console.error('Error destroying Hls instance:', e);
      }
      hlsRef.current = null;
    }

    // Clean up video element
    if (videoRef.current) {
      try {
        const videoElement = videoRef.current;
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
      } catch (e) {
        console.error('Error cleaning up video element:', e);
      }
    }

    // Reset initialization flag
    initializedRef.current = false;
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token'); // Or however you store your auth token
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Initialize HLS player with proper error handling
  const initializeHls = useCallback(() => {
    // Skip initialization if component is unmounted, video element doesn't exist,
    // no stream ID is provided, or player is already initialized
    if (!mountedRef.current || !videoRef.current || !memoizedStreamId || initializedRef.current) {
      return;
    }

    console.log('Initializing HLS player for stream:', memoizedStreamId);
    setStatus('connecting');
    initializedRef.current = true;

    const initializeHlsPlayer = (folderName) => {
      console.log(`Initializing HLS with folder: ${folderName}, URL will be: /api/streams/${memoizedStreamId}/hls/${folderName}/playlist.m3u8`);
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,
          manifestLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 5,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 6,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 4,
          startLevel: -1,
          xhrSetup: function (xhr) {
            xhr.timeout = 20000;
            // Add authentication
            const token = localStorage.getItem('token');
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            // Add credentials to enable cookies
            xhr.withCredentials = true;
          }
        });

        // Store the HLS instance
        hlsRef.current = hls;

        // Use the folder name in the HLS URL
        const hlsUrl = `${API_URL}/streams/${memoizedStreamId}/hls/${folderName}/playlist.m3u8`;
        console.log('Loading HLS source with folder:', hlsUrl);

        // Set up error handling before loading source
        hls.on(Hls.Events.ERROR, function (event, data) {
          if (!mountedRef.current) return;

          console.error('HLS Error:', event, data);

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Fatal network error', data);
                setStatus('network-error');

                // Try to recover
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error', data);
                setStatus('media-error');

                // Try to recover
                if (hlsRef.current) {
                  hlsRef.current.recoverMediaError();
                }
                break;
              default:
                console.error('Fatal error, cannot recover', data);
                setStatus('error');
                break;
            }
          }
        });

        // Set up manifest parsing handler
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          if (!mountedRef.current) return;

          console.log('HLS Manifest parsed, attempting to play');
          setStatus('connected');

          videoRef.current.play().catch(err => {
            console.error('Play error:', err);
            if (mountedRef.current) {
              setStatus('ready');
            }
          });
        });

        // Start loading the source
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
      }
      else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari which has native HLS support
        videoRef.current.src = `${API_URL}/streams/${memoizedStreamId}/hls/${folderName}/playlist.m3u8`;

        videoRef.current.addEventListener('loadedmetadata', () => {
          if (mountedRef.current) {
            setStatus('connected');
            videoRef.current.play().catch(() => {
              if (mountedRef.current) setStatus('ready');
            });
          }
        });

        videoRef.current.addEventListener('error', () => {
          if (mountedRef.current) setStatus('error');
        });
      } else {
        setStatus('not-supported');
      }
    };

    // If recordingFolder is provided, use it directly
    if (memoizedRecordingFolder) {
      // Make the request and wait for it to complete
      fetch(`${API_URL}/streams/${memoizedStreamId}/hls-latest-folder`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      })
        .then(() => {
          console.log('Latest folder request completed, initializing player with delay');
          // Add a small delay before initializing the player
          setTimeout(() => {
            initializeHlsPlayer(memoizedRecordingFolder);
          }, 500);
        })
        .catch(err => {
          console.error('Error in latest folder request:', err);
          // Try to initialize anyway after error
          setTimeout(() => {
            initializeHlsPlayer(memoizedRecordingFolder);
          }, 500);
        });

    } else {
      // For live streams, fetch the latest folder
      fetch(`${API_URL}/streams/${memoizedStreamId}/hls-latest-folder`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      })
        .then(response => {
          if (!response.ok) {
            console.error('Failed to fetch latest folder:', response.status, response.statusText);
            throw new Error('Failed to fetch latest folder');
          }
          return response.json();
        })
        .then(data => {
          const folderName = data.latestFolder;
          initializeHlsPlayer(folderName);
        })
        .catch(error => {
          console.error('Error fetching latest HLS folder:', error);
          setStatus('error');
        });
    }
  }, [memoizedStreamId, memoizedRecordingFolder]);

  // Initial setup effect - runs when streamId changes
  useEffect(() => {
    console.log('Stream ID or recording folder changed, initializing HLS');

    // Clean up existing player
    cleanupHls();

    // Initialize HLS player
    initializeHls();

    // Cleanup function for when component unmounts or stream changes
    return () => {
      cleanupHls();
    };
  }, [memoizedStreamId, memoizedRecordingFolder, cleanupHls, initializeHls]);

  // Handle component mount/unmount
  useEffect(() => {
    // Reset mount flag when component mounts
    mountedRef.current = true;

    return () => {
      // Mark as unmounted when component unmounts
      mountedRef.current = false;
    };
  }, []);

  // Handle restart with proper cleanup
  const handleRestart = useCallback(() => {
    if (!mountedRef.current) return;

    setStatus('restarting');

    // Skip restart endpoint call for historical recordings
    if (isHistorical) {
      // Just reinitialize the player
      cleanupHls();
      setTimeout(() => {
        if (!mountedRef.current) return;
        initializeHls();
      }, 1000);
      return;
    }

    // Call server endpoint to restart FFmpeg - use relative path
    fetch(`${API_URL}/streams/${streamId}/restart-hls`, {
      credentials: 'include' // Add this to ensure cookies are sent
    })
      .then(response => {
        if (!mountedRef.current) return;

        if (response.ok) {
          console.log('Stream restart requested successfully');

          // Clean up existing player
          cleanupHls();

          // Wait for FFmpeg to start up before re-initializing
          setTimeout(() => {
            if (!mountedRef.current) return;
            initializeHls();
          }, 3000);
        } else {
          console.error('Failed to restart stream:', response.status, response.statusText);
          setStatus('restart-failed');
        }
      })
      .catch(error => {
        if (!mountedRef.current) return;

        console.error('Error restarting stream:', error);
        setStatus('restart-failed');
      });
  }, [streamId, cleanupHls, initializeHls, isHistorical]);

  // Add auto-reconnect functionality for live streams only
  useEffect(() => {
    // Skip auto-reconnect for historical recordings
    if (isHistorical) {
      return;
    }

    let reconnectTimer;

    // Auto-reconnect for error states
    if (status === 'error' ||
      status === 'network-error' ||
      status.includes('failed')) {

      reconnectTimer = setTimeout(() => {
        if (mountedRef.current) {
          console.log('Auto-reconnect triggered due to error state:', status);
          handleRestart();
        }
      }, 30000); // Try to reconnect every 30 seconds
    }

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [status, handleRestart, isHistorical]);

  // Status messages and UI for different states
  const renderStatus = () => {
    switch (status) {
      case 'waiting':
      case 'connecting':
        return (
          <StatusOverlay>
            <CircularProgress color="secondary" sx={{ mb: 2 }} />
            <Typography>
              {isHistorical ? 'Loading recording...' : 'Connecting to stream...'}
            </Typography>
          </StatusOverlay>
        );
      case 'network-error':
        return (
          <StatusOverlay>
            <Typography variant="h6" sx={{ mb: 2 }}>Network Error</Typography>
            <Typography sx={{ mb: 3 }}>
              {isHistorical
                ? 'Failed to load the recording due to network issues.'
                : 'Connection to the stream was lost. Attempting to reconnect...'}
            </Typography>
            <Button variant="contained" color="primary" onClick={handleRestart}>
              {isHistorical ? 'Retry' : 'Restart Stream'}
            </Button>
          </StatusOverlay>
        );
      case 'error':
      case 'media-error':
      case 'restart-failed':
        return (
          <StatusOverlay>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {isHistorical ? 'Recording Error' : 'Stream Error'}
            </Typography>
            <Typography sx={{ mb: 3 }}>
              {isHistorical
                ? 'Failed to load the recording. The file might be corrupted or no longer available.'
                : 'Failed to load the stream. The camera might be offline.'}
            </Typography>
            <Button variant="contained" color="primary" onClick={handleRestart}>
              {isHistorical ? 'Retry' : 'Restart Stream'}
            </Button>
          </StatusOverlay>
        );
      case 'not-supported':
        return (
          <StatusOverlay>
            <Typography variant="h6" sx={{ mb: 2 }}>Browser Not Supported</Typography>
            <Typography>Your browser does not support HLS streams. Please try a different browser.</Typography>
          </StatusOverlay>
        );
      case 'restarting':
        return (
          <StatusOverlay>
            <CircularProgress color="secondary" sx={{ mb: 2 }} />
            <Typography>
              {isHistorical ? 'Reloading recording...' : 'Restarting stream...'}
            </Typography>
          </StatusOverlay>
        );
      case 'ready':
        return (
          <StatusOverlay>
            <Typography sx={{ mb: 2 }}>
              {isHistorical ? 'Recording is ready to play' : 'Stream is ready to play'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.play()
                    .then(() => {
                      if (mountedRef.current) setStatus('connected');
                    })
                    .catch(err => {
                      console.warn('Error playing video:', err);
                    });
                }
              }}
            >
              {isHistorical ? 'Play Recording' : 'Play Stream'}
            </Button>
          </StatusOverlay>
        );
      default:
        return null;
    }
  };

  return (
    <PlayerContainer>
      <VideoElement
        ref={videoRef}
        controls
        autoPlay
        muted={!isHistorical} // Unmute for historical recordings
        playsInline
      />
      {status !== 'connected' && renderStatus()}
    </PlayerContainer>
  );
};

export default React.memo(HlsStreamViewer);