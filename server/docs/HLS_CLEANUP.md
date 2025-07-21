# HLS Cleanup Service Documentation

## Overview

The HLS Cleanup Service automatically manages disk space for HLS recordings by removing old recordings when the captures directory exceeds a specified size limit (default: 1TB).

## Features

- **Automatic cleanup**: Runs periodically to check disk usage
- **Retention policy**: Protects recent recordings (configurable retention period)
- **Manual cleanup**: API endpoints for manual cleanup operations
- **Force cleanup**: Emergency cleanup that ignores retention period
- **Statistics**: Real-time monitoring of disk usage and cleanup status

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# HLS Cleanup Configuration
HLS_MAX_SIZE_GB=1000                    # Maximum size in GB (1TB default)
HLS_CLEANUP_INTERVAL_MS=3600000         # Check interval in milliseconds (1 hour)
HLS_RETENTION_DAYS=30                   # Minimum retention period in days
HLS_CAPTURES_PATH=                      # Custom captures path (optional)
HLS_AUTO_CLEANUP_ENABLED=true           # Enable automatic cleanup
HLS_EMERGENCY_THRESHOLD=0.95            # Emergency cleanup threshold (95%)
HLS_EMERGENCY_TARGET_SIZE=0.80          # Target size after emergency cleanup (80%)
```

### Configuration File

The cleanup service uses `server/config/cleanup.js` for configuration:

```javascript
module.exports = {
    hls: {
        maxSizeGB: process.env.HLS_MAX_SIZE_GB || 1000,
        cleanupIntervalMs: process.env.HLS_CLEANUP_INTERVAL_MS || (60 * 60 * 1000),
        retentionDays: process.env.HLS_RETENTION_DAYS || 30,
        capturesPath: process.env.HLS_CAPTURES_PATH || path.join(__dirname, '../public/captures'),
        autoCleanupEnabled: process.env.HLS_AUTO_CLEANUP_ENABLED === 'true' || true,
        emergencyThreshold: process.env.HLS_EMERGENCY_THRESHOLD || 0.95,
        emergencyTargetSize: process.env.HLS_EMERGENCY_TARGET_SIZE || 0.80,
    }
};
```

## How It Works

### Automatic Cleanup Process

1. **Periodic Check**: The service runs every hour (configurable) to check disk usage
2. **Size Calculation**: Calculates total size of the captures directory
3. **Threshold Check**: Compares current size against the maximum allowed size
4. **Recording Selection**: If over limit, selects oldest recordings for removal
5. **Retention Respect**: Only removes recordings older than the retention period
6. **Cleanup Execution**: Removes selected recordings and logs the results

### Directory Structure

The cleanup service works with this directory structure:
```
server/public/captures/
├── {streamId}/
│   └── HLS/
│       ├── recording_1234567890/
│       │   ├── playlist.m3u8
│       │   ├── segment_001.ts
│       │   ├── segment_002.ts
│       │   └── recording_info.json
│       └── recording_1234567891/
│           ├── playlist.m3u8
│           ├── segment_001.ts
│           └── recording_info.json
```

### Recording Metadata

Each recording includes a `recording_info.json` file with metadata:

```json
{
  "streamId": "687a5eb7b9e8f29469465a5a",
  "recordingFolder": "recording_1752951845461",
  "start": 1752951845461,
  "startTime": "2025-07-20T03:04:05.461Z",
  "end": 1752955445461,
  "endTime": "2025-07-20T04:04:05.461Z",
  "duration": 3600,
  "exitCode": 0,
  "reason": "completed",
  "created": "2025-07-20T03:04:05.461Z"
}
```

## API Endpoints

All cleanup endpoints require admin authentication.

### Get Cleanup Statistics

```http
GET /api/cleanup/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentSizeGB": "805.85",
    "maxSizeGB": 1000,
    "totalRecordings": 25,
    "eligibleForCleanup": 10,
    "protectedRecordings": 15,
    "retentionDays": 30,
    "isRunning": true
  }
}
```

### Manual Cleanup Trigger

```http
POST /api/cleanup/trigger
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup triggered successfully",
  "data": {
    "currentSizeGB": "750.23",
    "maxSizeGB": 1000,
    "totalRecordings": 20,
    "eligibleForCleanup": 5,
    "protectedRecordings": 15,
    "retentionDays": 30,
    "isRunning": true
  }
}
```

### Force Cleanup

```http
POST /api/cleanup/force
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "targetSizeGB": 500
}
```

**Response:**
```json
{
  "success": true,
  "message": "Force cleanup completed",
  "data": {
    "recordingsRemoved": 15,
    "freedGB": 255.62,
    "finalSizeGB": 500.00
  }
}
```

### Get Service Status

```http
GET /api/cleanup/status
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "maxSizeGB": 1000,
    "retentionDays": 30,
    "cleanupIntervalMinutes": 60
  }
}
```

### Start/Stop Service

```http
POST /api/cleanup/start
Authorization: Bearer <admin_token>
```

```http
POST /api/cleanup/stop
Authorization: Bearer <admin_token>
```

## Usage Examples

### Example 1: Basic Setup

1. Set environment variables in `.env`:
```bash
HLS_MAX_SIZE_GB=500
HLS_RETENTION_DAYS=7
```

2. The service will automatically:
   - Keep total recordings under 500GB
   - Protect recordings newer than 7 days
   - Check every hour for cleanup needs

### Example 2: Emergency Cleanup

If disk space is critically low:

```bash
curl -X POST http://localhost:5000/api/cleanup/force \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetSizeGB": 100}'
```

This will remove recordings (ignoring retention period) until total size is 100GB.

### Example 3: Monitoring

Check current status:

```bash
curl -X GET http://localhost:5000/api/cleanup/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Logging

The cleanup service provides detailed logging:

```
info: Starting HLS cleanup service - Max size: 1000GB, Check interval: 60 minutes
info: Current captures directory size: 805.85GB / 1000GB
info: Disk usage is within limits, no cleanup needed
warn: Disk usage exceeded limit (1050.23GB > 1000GB), starting cleanup...
info: Removing old recording: 687a5eb7b9e8f29469465a5a/recording_1752850110133 (45.67GB)
info: Cleanup completed: Removed 3 recordings, freed 137.45GB. New size: 912.78GB
```

## Best Practices

1. **Set Appropriate Retention**: Balance between storage efficiency and data availability
2. **Monitor Regularly**: Use the stats endpoint to monitor disk usage trends
3. **Emergency Planning**: Have a force cleanup strategy for critical situations
4. **Backup Important Recordings**: Consider backing up critical recordings before they're eligible for cleanup
5. **Adjust Intervals**: Increase cleanup frequency for high-volume recording scenarios

## Troubleshooting

### Service Not Starting

Check logs for:
- Configuration errors
- Permission issues with captures directory
- Missing environment variables

### Cleanup Not Working

Verify:
- Service is running (`GET /api/cleanup/status`)
- Disk usage exceeds threshold
- Recordings are older than retention period
- Sufficient permissions to delete files

### Performance Issues

For large directories:
- Consider increasing cleanup interval
- Monitor system resources during cleanup
- Use force cleanup during low-usage periods

## Integration

The cleanup service is automatically integrated with:

- **HLS Recorder**: Starts with the recorder service
- **Server Shutdown**: Gracefully stops with the server
- **WebSocket**: Can broadcast cleanup events (future enhancement)
- **Monitoring**: Provides metrics for external monitoring systems