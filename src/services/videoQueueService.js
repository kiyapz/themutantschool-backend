// src/services/videoQueue.service.js
import Queue from 'bull';
import { logger } from '../utils/logger.js';
import videoProcessingService from './videoProcessing.service.js';
import Video from '../models/video.model.js';

// Redis connection options with improved error handling
const redisOptions = {
  host: process.env.REDIS_HOST || 'simple-dog-25603.upstash.io',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'AWQDAAIjcDE1OTlhODAxMWZjMTg0NjZmOWRhN2Y2MWFjYTY1MGUyZXAxMA',
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 1000, 10000);
    logger.info(`Redis connection retry ${times}. Retrying in ${delay}ms...`);
    return delay;
  }
};

// Log Redis connection details (without password)
logger.info(`Connecting to Redis at ${redisOptions.host}:${redisOptions.port}`);

// Create video processing queue with improved options
const videoQueue = new Queue('video-processing', {
  redis: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: true,
    removeOnFail: false,
    timeout: 3600000 // 1 hour timeout for long-running jobs
  },
  settings: {
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
    maxStalledCount: 2      // Consider job stalled after 2 checks
  }
});

// Process jobs with concurrency limit
videoQueue.process(5, async (job) => {
  const { videoId } = job.data;
  logger.info(`Processing video job: ${videoId}`);
  
  try {
    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }
    
    // Update video status
    await Video.findByIdAndUpdate(videoId, {
      status: "PROCESSING",
      $push: { history: { status: "PROCESSING", createdAt: new Date() } }
    });
    
    // Update job progress
    job.progress(10);
    
    // Process video
    const result = await videoProcessingService.processVideo(videoId);
    
    // Update job progress
    job.progress(100);
    
    logger.info(`Video processing completed: ${videoId}`);
    return result;
  } catch (error) {
    logger.error(`Video processing job failed: ${error.message}`);
    
    // Update video status to FAILED
    await Video.findByIdAndUpdate(videoId, {
      status: "FAILED",
      $push: { history: { status: "FAILED", createdAt: new Date() } }
    });
    
    throw error;
  }
});

// Handle queue events
videoQueue.on('completed', (job, result) => {
  logger.info(`Video job completed: ${job.data.videoId}`);
});

videoQueue.on('failed', (job, error) => {
  logger.error(`Video job failed: ${job.data.videoId}, Error: ${error.message}`);
});

videoQueue.on('stalled', (job) => {
  logger.warn(`Video job stalled: ${job.data.videoId}`);
});

videoQueue.on('error', (error) => {
  logger.error(`Queue error: ${error.message}`);
});

/**
 * Add video to processing queue
 * @param {string} videoId - Video ID
 * @returns {Promise<Object>} - Job object
 */
export const queueVideoProcessing = async (videoId) => {
  logger.info(`Queueing video for processing: ${videoId}`);
  
  try {
    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }
    
    // Check if video is already in processing state
    if (video.status === "PROCESSING") {
      logger.warn(`Video ${videoId} is already being processed`);
      return {
        videoId,
        status: "ALREADY_PROCESSING"
      };
    }
    
    // Add job to queue
    const job = await videoQueue.add({
      videoId,
      timestamp: new Date()
    }, {
      priority: 1, // Higher priority for newer jobs
      jobId: videoId // Use videoId as jobId to prevent duplicates
    });
    
    return {
      jobId: job.id,
      videoId
    };
  } catch (error) {
    logger.error(`Error queueing video: ${error.message}`);
    throw error;
  }
};

/**
 * Get queue status
 * @returns {Promise<Object>} - Queue stats
 */
export const getQueueStatus = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      videoQueue.getWaitingCount(),
      videoQueue.getActiveCount(),
      videoQueue.getCompletedCount(),
      videoQueue.getFailedCount(),
      videoQueue.getDelayedCount()
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    logger.error(`Error getting queue status: ${error.message}`);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
      error: error.message
    };
  }
};

/**
 * Get all jobs in the queue
 * @param {string} status - Job status (waiting, active, completed, failed, delayed)
 * @param {number} start - Start index
 * @param {number} end - End index
 * @returns {Promise<Array>} - Array of jobs
 */
export const getJobs = async (status = 'waiting', start = 0, end = 10) => {
  try {
    const jobs = await videoQueue.getJobs([status], start, end);
    
    // Format job data for response
    return jobs.map(job => ({
      id: job.id,
      videoId: job.data.videoId,
      timestamp: job.data.timestamp,
      status: job.status,
      progress: job._progress,
      attempts: job.attemptsMade,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn
    }));
  } catch (error) {
    logger.error(`Error getting jobs: ${error.message}`);
    return [];
  }
};

/**
 * Clean completed and failed jobs
 * @returns {Promise<Object>} - Cleanup results
 */
export const cleanupJobs = async () => {
  try {
    const completedCount = await videoQueue.clean(86400000, 'completed'); // 24 hours
    const failedCount = await videoQueue.clean(604800000, 'failed'); // 7 days
    
    return {
      completed: completedCount,
      failed: failedCount
    };
  } catch (error) {
    logger.error(`Error cleaning up jobs: ${error.message}`);
    throw error;
  }
};

/**
 * Retry a failed job
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Retry result
 */
export const retryJob = async (jobId) => {
  try {
    const job = await videoQueue.getJob(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    await job.retry();
    
    return {
      jobId,
      status: 'retrying'
    };
  } catch (error) {
    logger.error(`Error retrying job: ${error.message}`);
    throw error;
  }
};

export default {
  queueVideoProcessing,
  getQueueStatus,
  getJobs,
  cleanupJobs,
  retryJob,
  videoQueue
};
