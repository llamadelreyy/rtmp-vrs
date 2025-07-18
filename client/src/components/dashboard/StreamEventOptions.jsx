import React, { useEffect, useState, useMemo } from 'react';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import { Button, Stack, Badge } from '@mui/material';
import { PREDEFINED_PROMPTS } from '../../utils/predefined-prompts';
import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import CheckIcon from '@mui/icons-material/Done';
import ClearIcon from '@mui/icons-material/Clear';

// Define the shiver animation for active buttons
const shiver = keyframes`
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(1px, 1px) rotate(1deg); }
  50% { transform: translate(0, -1px) rotate(-1deg); }
  75% { transform: translate(-1px, 0) rotate(1deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
`;

// Styled button component with animation prop
const AnimatedButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})(({ isActive }) => ({
  animation: isActive ? `${shiver} 0.5s infinite` : 'none',
}));

const StreamEventOptions = ({
  streams = [],
  onButtonClick = () => {},
  onRemoveFilter = () => {},
  onEventStreamsChange = () => {}, // New callback prop
  selectedEvent = null, // New prop to track which event is selected
}) => {
  const { send, connected, subscribe } = useWebSocketContext();

  // State to track detections for button activity (latest event)
  const [detections, setDetections] = useState({
    fire: false,
    intrusion: false,
    medical: false,
  });

  // State to track detection status per stream
  const [streamDetections, setStreamDetections] = useState({});

  // Subscribe to streams when connected
  useEffect(() => {
    if (!connected || !streams?.length) return;

    const streamIds = streams.map((stream) => stream._id);
    streamIds.forEach((streamId) => {
      send('stream:subscribe', streamId);
    });
  }, [connected, send, streams]);

  // Handle stream events and update detections
  useEffect(() => {
    if (!connected) return;

    const unsubscribe = subscribe('stream:event', (data) => {
      console.log('Stream event update received:', data);

      const streamId = data.streamId;
      const newDetections = {
        fire: false,
        intrusion: false,
        medical: false,
      };

      // Parse event data to determine detection status
      if (data.event?.detections) {
        newDetections.fire = !!data.event.detections.fire;
        newDetections.intrusion =
          !!data.event.detections.theft || !!data.event.detections.gun; // Map theft or gun to intrusion
        newDetections.medical = !!data.event.detections.medical;
      } else if (typeof data.event?.result === 'string') {
        try {
          const parsedResult = JSON.parse(data.event.result);
          newDetections.fire = !!parsedResult.fire;
          newDetections.intrusion = !!parsedResult.theft || !!parsedResult.gun; // Map theft or gun to intrusion
          newDetections.medical = !!parsedResult.medical;
        } catch (e) {
          console.error('Error parsing result string:', e);
          return;
        }
      }

      // Update streamDetections for this stream
      setStreamDetections((prev) => ({
        ...prev,
        [streamId]: newDetections,
      }));

      // Update detections state for button activity (based on latest event)
      setDetections(newDetections);
    });

    return () => unsubscribe();
  }, [connected, subscribe]);

  // Add this useEffect to notify parent component when streamDetections change
  useEffect(() => {
    // Create a map of event types to arrays of streamIds
    const eventStreams = {
      fire: [],
      intrusion: [],
      medical: [],
    };

    // Populate the map by checking each stream's detection status
    Object.entries(streamDetections).forEach(([streamId, detections]) => {
      if (detections.fire) eventStreams.fire.push(streamId);
      if (detections.intrusion) eventStreams.intrusion.push(streamId);
      if (detections.medical) eventStreams.medical.push(streamId);
    });

    // Call the callback with the event streams map
    onEventStreamsChange(eventStreams);
  }, [streamDetections, onEventStreamsChange]);

  // Compute event counts: number of streams with active detections per event type
  const eventCounts = useMemo(() => {
    const counts = { fire: 0, intrusion: 0, medical: 0 };
    Object.values(streamDetections).forEach((dets) => {
      if (dets.fire) counts.fire++;
      if (dets.intrusion) counts.intrusion++;
      if (dets.medical) counts.medical++;
    });
    return counts;
  }, [streamDetections]);

  // Check if the button should animate based on the latest detection
  const isButtonActive = (tag) => detections[tag];

  return (
    <Stack spacing={2} direction="row">
      {PREDEFINED_PROMPTS.filter((prompt) => prompt.tag !== 'analysis').map(
        (prompt) => {
          const buttonActive = isButtonActive(prompt.tag);
          const hasActiveDetections = eventCounts[prompt.tag] > 0;
          const isSelected = selectedEvent === prompt.tag;
          const buttonColor = hasActiveDetections ? 'error' : 'success'; // Red if counter > 0, green otherwise

          return (
            <Badge
              key={prompt.name}
              badgeContent={eventCounts[prompt.tag]}
              color="primary"
            >
              <AnimatedButton
                variant="contained"
                color={buttonColor}
                size="small"
                isActive={buttonActive && !isSelected} // Only animate if active and not selected
                onClick={() => onButtonClick(prompt.tag)}
                startIcon={isSelected && <CheckIcon />}
              >
                {prompt.shortLabel}
              </AnimatedButton>
            </Badge>
          );
        }
      )}
      {!!selectedEvent && (
        <Button
          variant="outlined"
          color="warning"
          size="small"
          onClick={() => onRemoveFilter(selectedEvent)}
          startIcon={<ClearIcon />}
        >
          Remove Filter
        </Button>
      )}
    </Stack>
  );
};

export default StreamEventOptions;
