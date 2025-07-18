import React, { useRef, useEffect, useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { CircularProgress, Typography, Button, Box } from '@mui/material';
import { Replay, ErrorOutline } from '@mui/icons-material';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import HlsStreamViewer from './HlsStreamViewer';

const PlayerContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  backgroundColor: '#000',
  borderRadius: theme.shape.borderRadius,
}));

const OverlayContainer = styled(Box)(({ theme }) => ({
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
  padding: theme.spacing(2),
  textAlign: 'center',
  zIndex: 10,
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 10,
}));

const ButtonContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

// Custom MJPEG image component
const MjpegPlayer = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
});

// Styled container with conditional border
const StreamContainer = styled('div', {
  shouldForwardProp: (prop) => prop !== 'hasActiveDetection',
})(({ hasActiveDetection, theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  border: hasActiveDetection ? '3px solid #f44336' : 'none',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  transition: 'border 0.3s ease-in-out',
}));

const StreamPlayer = ({
  stream,
  fullscreen = false,
  hasActiveDetection = false,
}) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const mjpegRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMjpeg, setIsMjpeg] = useState(false);
  const [isRtsp, setIsRtsp] = useState(false);

  // Helper function to determine if stream is MJPEG
  const isMjpegStream = useCallback((streamType, url) => {
    if (streamType?.toLowerCase() === 'mjpeg') return true;
    if (
      url &&
      (url.toLowerCase().includes('.mjpg') ||
        url.toLowerCase().includes('.mjpeg') ||
        url.toLowerCase().includes('mjpeg') ||
        url.toLowerCase().includes('=mjpg'))
    )
      return true;
    return false;
  }, []);

  const isRtspStream = useCallback((streamType, url) => {
    if (streamType?.toLowerCase() === 'rtsp') return true;
    if (url && url.toLowerCase().startsWith('rtsp://')) return true;
    return false;
  }, []);

  const getSourceType = useCallback(
    (streamType, url) => {
      if (isMjpegStream(streamType, url)) {
        return 'mjpeg';
      }

      if (isRtspStream(streamType, url)) {
        return 'rtsp';
      }

      switch (streamType?.toLowerCase()) {
        case 'hls':
          return 'application/x-mpegURL';
        case 'http':
          if (url && url.toLowerCase().endsWith('.mp4')) {
            return 'video/mp4';
          } else if (url && url.toLowerCase().endsWith('.webm')) {
            return 'video/webm';
          } else if (url && url.toLowerCase().includes('.m3u8')) {
            return 'application/x-mpegURL';
          }
          // Try to detect other formats
          return 'video/mp4';
        default:
          // Try to infer from URL if type is not specified
          if (url) {
            if (url.toLowerCase().includes('.m3u8')) {
              return 'application/x-mpegURL';
            } else if (url.toLowerCase().includes('.mp4')) {
              return 'video/mp4';
            } else if (url.toLowerCase().includes('.webm')) {
              return 'video/webm';
            }
          }
          return 'application/x-mpegURL';
      }
    },
    [isMjpegStream, isRtspStream]
  );

  const initializePlayer = useCallback(() => {
    if (!videoRef.current) return;

    // Check if we need to use MJPEG mode
    if (isMjpegStream(stream?.type, stream?.url)) {
      console.log('Using MJPEG mode for stream:', stream?.url);
      setIsMjpeg(true);
      setIsRtsp(false);
      setLoading(false);
      return;
    }

    // Check if we need to use RTSP (which will use HlsStreamViewer)
    if (isRtspStream(stream?.type, stream?.url)) {
      console.log('Using RTSP mode for stream:', stream?.url);
      setIsMjpeg(false);
      setIsRtsp(true);
      setLoading(false);
      return;
    }

    setIsMjpeg(false);
    setIsRtsp(false);

    // Dispose existing player if it exists
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    const videoElement = videoRef.current;

    // Detect if source is HLS
    const sourceType = getSourceType(stream?.type, stream?.url);
    const isHls = sourceType === 'application/x-mpegURL';

    // VideoJS options
    const options = {
      autoplay: true,
      controls: true,
      responsive: true,
      fluid: !fullscreen,
      aspectRatio: '16:9',
      preload: 'auto',
      liveui: true,
      playbackRates: [0.5, 1, 1.5, 2],
      controlBar: {
        volumePanel: { inline: false },
        pictureInPictureToggle: false,
      },
      html5: {
        hls: {
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          overrideNative: !videojs.browser.IS_SAFARI, // Use native HLS in Safari
          cacheEncryptionKeys: true,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
      sources: [
        {
          src: stream?.url,
          type: sourceType,
        },
      ],
    };

    if (isHls) {
      options.html5.hls = {
        ...options.html5.hls,
        // Optimize HLS playback
        limitRenditionByPlayerDimensions: true,
        withCredentials: false,
        // Retry options
        maxLoadingDelay: 4, // Maximum delay before timing out on fragment loading
        maxMaxBufferLength: 30, // Maximum buffer length in seconds
        liveSyncDuration: 3, // Edge of live window in seconds
        liveMaxLatencyDuration: 10, // Maximum DVR window in seconds
      };
    }

    console.log('Initializing player with options:', options);
    console.log('Stream details:', {
      url: stream?.url,
      type: stream?.type,
      sourceType,
    });

    setLoading(true);
    setError(null);

    try {
      playerRef.current = videojs(
        videoElement,
        options,
        function onPlayerReady() {
          const player = this;

          console.log('Player initialized successfully');

          player.on('loadedmetadata', () => {
            console.log('Stream metadata loaded successfully');
            setLoading(false);
          });

          player.on('error', (e) => {
            const error = player.error();
            console.error('Player error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Stream that failed:', {
              url: stream?.url,
              type: stream?.type,
              sourceType,
            });
            setError(
              'Failed to load stream: ' +
                (player.error()?.message || 'Unknown error')
            );
            setLoading(false);

            if (isHls && stream?.type !== 'rtsp') {
              setIsRtsp(true);
            }
          });

          player.on('waiting', () => {
            console.log('Player is waiting for data');
          });

          player.on('canplay', () => {
            console.log('Player can start playing');
          });

          player.on('playing', () => {
            console.log('Player has started playing');
          });

          player.on('pause', () => {
            console.log('Player paused');
            setIsPaused(true);
          });

          player.on('play', () => {
            console.log('Player play event triggered');
            setIsPaused(false);
          });

          // Add timeout for loading check
          const loadingTimeout = setTimeout(() => {
            if (loading && !player.error()) {
              console.warn('Stream loading timeout reached');
              setError(
                'Stream took too long to load. The stream might be offline.'
              );
              setLoading(false);

              // If it's an HLS stream that timed out, try HlsStreamViewer
              if (isHls && stream?.type !== 'rtsp') {
                setIsRtsp(true);
              }
            }
          }, 15000); // 15 seconds timeout

          // Clear timeout when metadata is loaded
          player.on('loadedmetadata', () => {
            clearTimeout(loadingTimeout);
          });
        }
      );
    } catch (err) {
      console.error('Video.js player initialization error:', err);
      setError('Failed to initialize player: ' + err.message);
      setLoading(false);
    }
  }, [stream, fullscreen, getSourceType, isMjpegStream, isRtspStream, loading]);

  // Handle MJPEG image loading
  useEffect(() => {
    if (isMjpeg && mjpegRef.current) {
      mjpegRef.current.onload = () => {
        console.log('MJPEG stream loaded successfully');
        setLoading(false);
      };

      mjpegRef.current.onerror = (e) => {
        console.error('MJPEG stream error:', e);
        setError('Failed to load MJPEG stream. The camera might be offline.');
        setLoading(false);
      };
    }
  }, [isMjpeg]);

  // Handle clean up when component unmounts or stream changes
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  // Initialize player when stream changes
  useEffect(() => {
    if (stream?.url) {
      initializePlayer();
    }
  }, [stream, initializePlayer]);

  // Handle retry on error
  const handleRetry = () => {
    setError(null);

    // Reset to standard player first
    setIsRtsp(false);
    setIsMjpeg(false);

    // Re-initialize
    initializePlayer();
  };

  // Add blicking border animation
  useEffect(() => {
    // Create a style element
    const style = document.createElement('style');
    // Define the keyframes animation
    style.innerHTML = `
      @keyframes blinkingBorder {
        0% { border-color: #ff0000; }
        50% { border-color: transparent; }
        100% { border-color: #ff0000; }
      }
    `;
    // Append to head
    document.head.appendChild(style);
    
    // Cleanup
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle switching to HLS mode
  const switchToHlsMode = () => {
    setIsRtsp(true);
    setError(null);
    setLoading(false);
  };

  if (!stream) {
    return (
      <PlayerContainer>
        <OverlayContainer>
          <ErrorOutline sx={{ fontSize: 50, mb: 2 }} />
          <Typography variant="h6">No stream selected</Typography>
          <Typography variant="body2">
            Please select a stream to view
          </Typography>
        </OverlayContainer>
      </PlayerContainer>
    );
  }

  // For RTSP streams, use the HlsStreamViewer component instead
  if (isRtsp) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          border: hasActiveDetection ? '5px solid #f44336' : 'none',
          animation: hasActiveDetection ? 'blinkingBorder 1s linear infinite' : 'none',
        }}
      >
        <HlsStreamViewer
          streamId={stream._id}
          streamUrl={stream.url}
          key={`hls-${stream._id}`} // Add a key to ensure proper mounting/unmounting
        />
      </Box>
    );
  }

  return (
    <StreamContainer hasActiveDetection={hasActiveDetection}>
      <PlayerContainer>
        {isMjpeg ? (
          <MjpegPlayer ref={mjpegRef} src={stream.url} alt="MJPEG Stream" />
        ) : (
          <div data-vjs-player>
            <video
              ref={videoRef}
              className="video-js vjs-big-play-centered vjs-fluid"
              playsInline
            />
          </div>
        )}

        {loading && (
          <LoadingContainer>
            <CircularProgress color="secondary" />
          </LoadingContainer>
        )}

        {error && (
          <OverlayContainer>
            <ErrorOutline sx={{ fontSize: 50, mb: 2 }} />
            <Typography variant="h6">Stream Error</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
            <ButtonContainer sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Replay />}
                onClick={handleRetry}
              >
                Retry
              </Button>

              {/* Show option to switch to HLS mode for certain errors */}
              {!isRtsp && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={switchToHlsMode}
                >
                  Try HLS Mode
                </Button>
              )}
            </ButtonContainer>
          </OverlayContainer>
        )}
      </PlayerContainer>
    </StreamContainer>
  );
};

export default React.memo(StreamPlayer);
