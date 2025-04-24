// src/queues/worker.js
import { Worker, QueueEvents } from 'bullmq';
import { VIDEO_QUEUE_EVENTS, NOTIFY_EVENTS } from './constants.js';
import { QUEUE_EVENT_HANDLERS } from './handlers.js';
import { logger } from '../utils/logger.js';
import Redis from 'ioredis';

// Shared Redis connection configuration
const redisConfig = {
  host: 'simple-dog-25603.upstash.io',
  port: 6379,
  password: 'AWQDAAIjcDE1OTlhODAxMWZjMTg0NjZmOWRhN2Y2MWFjYTY1MGUyZXAxMA',
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: null, // Must be null for BullMQ
  enableReadyCheck: false,    // Recommended for Upstash
  connectTimeout: 10000,      // Increase connection timeout
  disconnectTimeout: 5000,    // Timeout for graceful disconnects
  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000);
    logger.info(`Redis connection retry ${times}. Retrying in ${delay}ms...`);
    return delay;
  }
};

// Create a singleton Redis client
let redisClient = null;

// Create or return existing Redis client
export const createRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);
    
    // Add event handlers for connection issues
    redisClient.on('error', (err) => {
      logger.error(`Redis connection error: ${err.message}`);
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
  }
  return redisClient;
};

// Get a new connection for BullMQ components
const getNewConnection = () => new Redis(redisConfig);

export const listenQueueEvent = (queueName) => {
  try {
    // Create separate connections for QueueEvents and Worker
    // as recommended by BullMQ docs
    const queueEvents = new QueueEvents(queueName, {
      connection: getNewConnection()
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.info(`${jobId} has failed with reason ${failedReason}`);
    });

    const worker = new Worker(
      queueName,
      async (job) => {
        const handler = QUEUE_EVENT_HANDLERS[queueName];
        if (handler) {
          return await handler(job);
        }
        throw new Error('No handler found for queue: ' + queueName);
      },
      { 
        connection: getNewConnection(),
        lockDuration: 30000, // 30 seconds
        concurrency: 5,
        stalledInterval: 30000, // Check for stalled jobs every 30 seconds
        maxStalledCount: 3     // Number of times a job can be marked as stalled
      }
    );

    worker.on('completed', (job) => {
      logger.info(`${job.id} has completed!`);
    });

    worker.on('failed', (job, err) => {
      logger.info(`${job.id} has failed with ${err.message}`);
    });

    worker.on('error', (err) => {
      logger.error(`Worker error for queue ${queueName}: ${err.message}`);
    });

    logger.info(queueName, ' worker started', new Date().toTimeString());
    return { worker, queueEvents };
  } catch (error) {
    logger.error(`Error setting up queue ${queueName}: ${error.message}`);
    return null;
  }
};

export const setupAllQueueEvents = async () => {
  try {
    // Test Redis connection before setting up queues
    const testClient = createRedisClient();
    await testClient.ping();
    logger.info('Successfully connected to Upstash Redis');
    
    // Store worker instances to prevent garbage collection
    const workers = [];
    
    Object.values(VIDEO_QUEUE_EVENTS).forEach((queueName) => {
      const workerInstance = listenQueueEvent(queueName);
      if (workerInstance) {
        workers.push(workerInstance);
      }
    });

    // Import and setup video handler module
    try {
      const { setup: setupVideoHandler } = await import('../models/video/handler.js');
      await setupVideoHandler();
    } catch (handlerError) {
      logger.error(`Error setting up video handler: ${handlerError.message}`);
      // Continue execution even if handler setup fails
    }
    
    // Add graceful shutdown handler
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, closing workers...');
      await Promise.all(workers.map(w => w.worker.close()));
      if (redisClient) {
        await redisClient.quit();
      }
    });
    
    return true;
  } catch (error) {
    logger.error(`Redis connection error: ${error.message}`);
    logger.info('Continuing without Redis queue functionality');
    return false;
  }
};
