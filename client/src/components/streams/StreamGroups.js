import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';

const StreamGroups = ({ streams, activeGroup, onGroupChange }) => {
  const groups = ['door', 'store', 'escalator', 'elevator', 'other'];
  
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs value={activeGroup} onChange={onGroupChange}>
        <Tab label={`All (${streams.length})`} value="all" />
        {groups.map(group => (
          <Tab 
            key={group}
            label={`${group} (${streams.filter(s => (s.category || 'Ungrouped') === group).length})`}
            value={group}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default StreamGroups;
