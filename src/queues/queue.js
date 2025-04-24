// src/queues/queue.js
import { Queue } from "bullmq";
import { ALL_EVENTS as QUEUE_EVENTS } from "./constants.js";
import { logger } from "../utils/logger.js";
import eventEmitter from "../utils/event-manager.js";
import { createRedisClient } from "./worker.js";
import Redis from "ioredis";

// Use the same Redis configuration from worker.js
const redisConfig = {
  host: 'simple-dog-25603.upstash.io',
  port: 6379,
  password: 'AWQDAAIjcDE1OTlhODAxMWZjMTg0NjZmOWRhN2Y2MWFjYTY1MGUyZXAxMA',
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: null, // Must be null for BullMQ
  enableReadyCheck: false,    // Recommended for Upstash
  connectTimeout: 10000,      // Increase connection timeout
  retryStrategy: (times) => Math.min(times * 100, 3000)
};

// Get a new connection for BullMQ components
const getNewConnection = () => new Redis(redisConfig);

// Initialize queues with error handling
let queues = [];
try {
  queues = Object.values(QUEUE_EVENTS).map((queueName) => {
    return {
      name: queueName,
      queueObj: new Queue(queueName, {
        connection: getNewConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: 10, // Keep last 10 failed jobs
        },
      }),
    };
  });
  logger.info(`Initialized ${queues.length} Redis queues successfully`);
} catch (error) {
  logger.error(`Failed to initialize Redis queues: ${error.message}`);
  queues = [];
}

export const addQueueItem = async (queueName, item) => {
  try {
    logger.info("addQueueItem", queueName, item);
    const queue = queues.find((q) => q.name === queueName);

    if (!queue) {
      // Try to create the queue on demand if it doesn't exist
      if (queues.length === 0) {
        const newQueue = new Queue(queueName, {
          connection: getNewConnection(),
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: 10,
          },
        });
        queues.push({
          name: queueName,
          queueObj: newQueue,
        });
        
        await newQueue.add(queueName, item, {
          removeOnComplete: true,
          removeOnFail: false,
        });
        
        // Emit event regardless of queue status
        eventEmitter.emit(`${queueName}`, item);
        return;
      }

      logger.warn(`Queue ${queueName} not found, emitting event only`);
      eventEmitter.emit(`${queueName}`, item);
      return;
    }

    // Emit event
    eventEmitter.emit(`${queueName}`, item);
    
    // Add job to queue
    const job = await queue.queueObj.add(queueName, item, {
      removeOnComplete: true,
      removeOnFail: false,
    });
    
    logger.info(`Job ${job.id} added to queue ${queueName}`);
  } catch (error) {
    logger.error(`Error adding item to queue ${queueName}: ${error.message}`);
    // Still emit the event even if queue operation fails
    eventEmitter.emit(`${queueName}`, item);
  }
};

// Function to check Redis connection status
export const checkRedisConnection = async () => {
  try {
    const client = createRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    logger.error(`Redis connection check failed: ${error.message}`);
    return false;
  }
};

// Function to clean up queues
export const cleanupQueues = async () => {
  try {
    for (const queue of queues) {
      await queue.queueObj.close();
    }
    logger.info('All queues closed successfully');
  } catch (error) {
    logger.error(`Error closing queues: ${error.message}`);
  }
};
