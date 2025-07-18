export const calculateOptimalLayout = (streams, containerWidth, containerHeight) => {
    const streamCount = streams.length;
    
    if (streamCount === 0) return [];
    if (streamCount === 1) return [{ i: '0', x: 0, y: 0, w: 12, h: 12 }];
    
    // Calculate optimal grid dimensions
    const aspectRatio = containerWidth / containerHeight;
    const cols = Math.ceil(Math.sqrt(streamCount * aspectRatio));
    const rows = Math.ceil(streamCount / cols);
    
    // Calculate cell dimensions
    const cellWidth = Math.floor(12 / cols);
    const cellHeight = Math.floor(12 / rows);
    
    return streams.map((stream, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      // Priority streams get double size if space allows
      const width = stream.priority ? Math.min(cellWidth * 2, 12) : cellWidth;
      const height = stream.priority ? Math.min(cellHeight * 2, 12) : cellHeight;
      
      return {
        i: index.toString(),
        x: col * cellWidth,
        y: row * cellHeight,
        w: width,
        h: height,
        stream
      };
    });
  };
  