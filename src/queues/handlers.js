// src/queues/handlers.js
import { VIDEO_QUEUE_EVENTS as QUEUE_EVENTS, NOTIFY_EVENTS } from './constants.js';
import { processRawFileToMp4, processMp4ToHls, generateThumbnail} from './video-processor.js';
import { addQueueItem } from './queue.js';
import { logger } from '../utils/logger.js';
import eventEmitter from '../utils/event-manager.js';
import { requireFn } from '../../utils/module-helper.js';
const ffmpeg = requireFn('fluent-ffmpeg');
const uploadedHandler = async (job) => {
  logger.info('uploaded handler!', job.data.title);
  await addQueueItem(QUEUE_EVENTS.VIDEO_PROCESSING, {
    ...job.data,
    completed: true,
  });
};

const processingHandler = async (job) => {
  logger.info('processing handler!', job.data.path);
  await processRawFileToMp4(`./${job.data.path}`, `./uploads/processed`, {
    ...job.data,
    completed: true,
    next: QUEUE_EVENTS.VIDEO_PROCESSED,
  });
};

const processedHandler = async (job) => {
  logger.info('processed handler!', job.data.path);
  await addQueueItem(QUEUE_EVENTS.VIDEO_HLS_CONVERTING, {
    ...job.data,
    completed: true,
    next: QUEUE_EVENTS.VIDEO_HLS_CONVERTING,
  });
};

const hlsConvertingHandler = async (job) => {
  logger.info('HLS converting handler!', job.data.path);
  const hlsConverted = await processMp4ToHls(
    `./${job.data.path}`,
    `./uploads/hls`,
    {
      ...job.data,
      completed: true,
      next: QUEUE_EVENTS.VIDEO_HLS_CONVERTED,
    }
  );
  logger.info('hlsConverted', hlsConverted);
};

const hlsConvertedHandler = async (job) => {
  logger.info('hls converted handler!', job.data.filename);
  await addQueueItem(NOTIFY_EVENTS.NOTIFY_VIDEO_HLS_CONVERTED, {
    ...job.data,
    completed: true,
    next: null,
  });
};

const notifyVideoHlsConvertedHandler = async (job) => {
  logger.info('notifyVideoHlsConvertedHandler handler!', job.data);
  eventEmitter.emit(`${NOTIFY_EVENTS.NOTIFY_VIDEO_HLS_CONVERTED}`, job.data);
  return { ...job.data, completed: true, next: null };
};

export const QUEUE_EVENT_HANDLERS = {
  [QUEUE_EVENTS.VIDEO_UPLOADED]: uploadedHandler,
  [QUEUE_EVENTS.VIDEO_PROCESSING]: processingHandler,
  [QUEUE_EVENTS.VIDEO_PROCESSED]: processedHandler,
  [QUEUE_EVENTS.VIDEO_HLS_CONVERTING]: hlsConvertingHandler,
  [QUEUE_EVENTS.VIDEO_HLS_CONVERTED]: hlsConvertedHandler,
  [NOTIFY_EVENTS.NOTIFY_VIDEO_HLS_CONVERTED]: notifyVideoHlsConvertedHandler,
};
