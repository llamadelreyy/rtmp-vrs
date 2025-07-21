const path = require('path');

module.exports = {
    hls: {
        // Maximum size of captures directory in GB (1TB = 1000GB)
        maxSizeGB: process.env.HLS_MAX_SIZE_GB || 1000,
        
        // How often to check disk usage (in milliseconds)
        // Default: 1 hour = 60 * 60 * 1000
        cleanupIntervalMs: process.env.HLS_CLEANUP_INTERVAL_MS || (60 * 60 * 1000),
        
        // Minimum retention period in days
        // Recordings newer than this will not be deleted
        retentionDays: process.env.HLS_RETENTION_DAYS || 30,
        
        // Path to captures directory
        capturesPath: process.env.HLS_CAPTURES_PATH || path.join(__dirname, '../public/captures'),
        
        // Enable automatic cleanup
        autoCleanupEnabled: process.env.HLS_AUTO_CLEANUP_ENABLED === 'true' || true,
        
        // Emergency cleanup threshold (percentage of max size)
        // When this threshold is reached, force cleanup will be triggered
        emergencyThreshold: process.env.HLS_EMERGENCY_THRESHOLD || 0.95, // 95%
        
        // Target size after emergency cleanup (percentage of max size)
        emergencyTargetSize: process.env.HLS_EMERGENCY_TARGET_SIZE || 0.80, // 80%
    }
};