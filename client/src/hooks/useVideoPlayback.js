// client/src/hooks/useVideoPlayback.js
import { useState, useCallback } from 'react';

const useVideoPlayback = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  
  const playVideo = useCallback((videoData) => {
    setCurrentVideo(videoData);
    setIsPlaying(true);
  }, []);
  
  const stopVideo = useCallback(() => {
    setIsPlaying(false);
    setCurrentVideo(null);
  }, []);
  
  return {
    isPlaying,
    currentVideo,
    playVideo,
    stopVideo
  };
};

export default useVideoPlayback;