const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

class HLSCleanupService {
    constructor(options = {}) {
        this.capturesPath = options.capturesPath || path.join(__dirname, '../public/captures');
        this.maxSizeGB = options.maxSizeGB || 1000; // 1TB default
        this.maxSizeBytes = this.maxSizeGB * 1024 * 1024 * 1024;
        this.cleanupIntervalMs = options.cleanupIntervalMs || 60 * 60 * 1000; // 1 hour
        this.retentionDays = options.retentionDays || 30; // Keep recordings for 30 days minimum
        this.isRunning = false;
        this.cleanupTimer = null;
    }

    /**
     * Start the automatic cleanup service
     */
    start() {
        if (this.isRunning) {
            logger.warn('HLS cleanup service is already running');
            return;
        }

        this.isRunning = true;
        logger.info(`Starting HLS cleanup service - Max size: ${this.maxSizeGB}GB, Check interval: ${this.cleanupIntervalMs/1000/60} minutes`);
        
        // Run initial cleanup
        this.performCleanup();
        
        // Schedule periodic cleanup
        this.cleanupTimer = setInterval(() => {
            this.performCleanup();
        }, this.cleanupIntervalMs);
    }

    /**
     * Stop the automatic cleanup service
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        logger.info('HLS cleanup service stopped');
    }

    /**
     * Get the total size of the captures directory
     */
    async getDirectorySize(dirPath) {
        try {
            let totalSize = 0;
            const items = await fs.readdir(dirPath, { withFileTypes: true });

            for (const item of items) {
                const itemPath = path.join(dirPath, item.name);
                if (item.isDirectory()) {
                    totalSize += await this.getDirectorySize(itemPath);
                } else {
                    const stats = await fs.stat(itemPath);
                    totalSize += stats.size;
                }
            }

            return totalSize;
        } catch (error) {
            logger.error(`Error calculating directory size for ${dirPath}:`, error);
            return 0;
        }
    }

    /**
     * Get all recording directories with their metadata
     */
    async getRecordingDirectories() {
        try {
            const recordings = [];
            const streamDirs = await fs.readdir(this.capturesPath, { withFileTypes: true });

            for (const streamDir of streamDirs) {
                if (!streamDir.isDirectory()) continue;

                const streamPath = path.join(this.capturesPath, streamDir.name);
                const hlsPath = path.join(streamPath, 'HLS');

                try {
                    const hlsExists = await fs.access(hlsPath).then(() => true).catch(() => false);
                    if (!hlsExists) continue;

                    const recordingDirs = await fs.readdir(hlsPath, { withFileTypes: true });

                    for (const recordingDir of recordingDirs) {
                        if (!recordingDir.isDirectory()) continue;

                        const recordingPath = path.join(hlsPath, recordingDir.name);
                        const infoPath = path.join(recordingPath, 'recording_info.json');

                        try {
                            const stats = await fs.stat(recordingPath);
                            const size = await this.getDirectorySize(recordingPath);
                            
                            let metadata = {
                                createdAt: stats.birthtime,
                                streamId: streamDir.name,
                                recordingId: recordingDir.name
                            };

                            // Try to read recording info if available
                            try {
                                const infoExists = await fs.access(infoPath).then(() => true).catch(() => false);
                                if (infoExists) {
                                    const infoContent = await fs.readFile(infoPath, 'utf8');
                                    const info = JSON.parse(infoContent);
                                    metadata = { ...metadata, ...info };
                                }
                            } catch (infoError) {
                                // Info file doesn't exist or is corrupted, use directory stats
                            }

                            recordings.push({
                                path: recordingPath,
                                size: size,
                                createdAt: metadata.createdAt,
                                streamId: metadata.streamId,
                                recordingId: metadata.recordingId,
                                metadata: metadata
                            });
                        } catch (statError) {
                            logger.warn(`Could not get stats for recording ${recordingPath}:`, statError);
                        }
                    }
                } catch (hlsError) {
                    logger.warn(`Could not read HLS directory for stream ${streamDir.name}:`, hlsError);
                }
            }

            // Sort by creation date (oldest first)
            recordings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            return recordings;
        } catch (error) {
            logger.error('Error getting recording directories:', error);
            return [];
        }
    }

    /**
     * Remove a recording directory
     */
    async removeRecording(recordingPath) {
        try {
            await fs.rm(recordingPath, { recursive: true, force: true });
            logger.info(`Removed recording: ${recordingPath}`);
            return true;
        } catch (error) {
            logger.error(`Failed to remove recording ${recordingPath}:`, error);
            return false;
        }
    }

    /**
     * Check if a recording is safe to delete (respects retention period)
     */
    isRecordingSafeToDelete(recording) {
        const now = new Date();
        const recordingAge = now - new Date(recording.createdAt);
        const retentionPeriod = this.retentionDays * 24 * 60 * 60 * 1000;
        
        return recordingAge > retentionPeriod;
    }

    /**
     * Perform cleanup based on disk usage and retention policies
     */
    async performCleanup() {
        try {
            logger.info('Starting HLS cleanup check...');

            // Check if captures directory exists
            try {
                await fs.access(this.capturesPath);
            } catch (error) {
                logger.warn(`Captures directory does not exist: ${this.capturesPath}`);
                return;
            }

            // Get current directory size
            const currentSize = await this.getDirectorySize(this.capturesPath);
            const currentSizeGB = (currentSize / (1024 * 1024 * 1024)).toFixed(2);
            
            logger.info(`Current captures directory size: ${currentSizeGB}GB / ${this.maxSizeGB}GB`);

            if (currentSize <= this.maxSizeBytes) {
                logger.info('Disk usage is within limits, no cleanup needed');
                return;
            }

            logger.warn(`Disk usage exceeded limit (${currentSizeGB}GB > ${this.maxSizeGB}GB), starting cleanup...`);

            // Get all recordings
            const recordings = await this.getRecordingDirectories();
            if (recordings.length === 0) {
                logger.warn('No recordings found for cleanup');
                return;
            }

            let totalFreed = 0;
            let recordingsRemoved = 0;
            let updatedSize = currentSize;

            // Remove oldest recordings until we're under the limit
            for (const recording of recordings) {
                // Check if we're still over the limit
                if (updatedSize <= this.maxSizeBytes) {
                    break;
                }

                // Only remove recordings that are past the retention period
                if (!this.isRecordingSafeToDelete(recording)) {
                    logger.info(`Skipping recent recording (${recording.recordingId}) - within retention period`);
                    continue;
                }

                logger.info(`Removing old recording: ${recording.streamId}/${recording.recordingId} (${(recording.size / (1024 * 1024 * 1024)).toFixed(2)}GB)`);
                
                const removed = await this.removeRecording(recording.path);
                if (removed) {
                    totalFreed += recording.size;
                    updatedSize -= recording.size;
                    recordingsRemoved++;
                }
            }

            const freedGB = (totalFreed / (1024 * 1024 * 1024)).toFixed(2);
            const finalSizeGB = (updatedSize / (1024 * 1024 * 1024)).toFixed(2);

            if (recordingsRemoved > 0) {
                logger.info(`Cleanup completed: Removed ${recordingsRemoved} recordings, freed ${freedGB}GB. New size: ${finalSizeGB}GB`);
            } else {
                logger.warn('No recordings were eligible for removal (all within retention period)');
            }

            // If still over limit after removing all eligible recordings
            if (updatedSize > this.maxSizeBytes) {
                logger.warn(`Still over disk limit after cleanup (${finalSizeGB}GB > ${this.maxSizeGB}GB). Consider increasing retention period or disk space.`);
            }

        } catch (error) {
            logger.error('Error during HLS cleanup:', error);
        }
    }

    /**
     * Get cleanup statistics
     */
    async getCleanupStats() {
        try {
            const currentSize = await this.getDirectorySize(this.capturesPath);
            const recordings = await this.getRecordingDirectories();
            
            const eligibleForCleanup = recordings.filter(r => this.isRecordingSafeToDelete(r));
            const protectedRecordings = recordings.filter(r => !this.isRecordingSafeToDelete(r));

            return {
                currentSizeGB: (currentSize / (1024 * 1024 * 1024)).toFixed(2),
                maxSizeGB: this.maxSizeGB,
                totalRecordings: recordings.length,
                eligibleForCleanup: eligibleForCleanup.length,
                protectedRecordings: protectedRecordings.length,
                retentionDays: this.retentionDays,
                isRunning: this.isRunning
            };
        } catch (error) {
            logger.error('Error getting cleanup stats:', error);
            return null;
        }
    }

    /**
     * Force cleanup (ignores retention period for emergency cleanup)
     */
    async forceCleanup(targetSizeGB) {
        try {
            const targetBytes = targetSizeGB * 1024 * 1024 * 1024;
            const recordings = await this.getRecordingDirectories();
            
            let currentSize = await this.getDirectorySize(this.capturesPath);
            let totalFreed = 0;
            let recordingsRemoved = 0;

            logger.warn(`Force cleanup initiated - Target size: ${targetSizeGB}GB`);

            for (const recording of recordings) {
                if (currentSize <= targetBytes) {
                    break;
                }

                logger.info(`Force removing recording: ${recording.streamId}/${recording.recordingId}`);
                const removed = await this.removeRecording(recording.path);
                if (removed) {
                    totalFreed += recording.size;
                    currentSize -= recording.size;
                    recordingsRemoved++;
                }
            }

            const freedGB = (totalFreed / (1024 * 1024 * 1024)).toFixed(2);
            const finalSizeGB = (currentSize / (1024 * 1024 * 1024)).toFixed(2);

            logger.warn(`Force cleanup completed: Removed ${recordingsRemoved} recordings, freed ${freedGB}GB. Final size: ${finalSizeGB}GB`);

            return {
                recordingsRemoved,
                freedGB: parseFloat(freedGB),
                finalSizeGB: parseFloat(finalSizeGB)
            };
        } catch (error) {
            logger.error('Error during force cleanup:', error);
            throw error;
        }
    }
}

module.exports = HLSCleanupService;