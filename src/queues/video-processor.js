// src/queues/video-processor.js
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { VIDEO_QUEUE_EVENTS as QUEUE_EVENTS } from './constants.js';
import { addQueueItem } from './queue.js';
import { logger } from '../utils/logger.js';

const configureFFMPEG = async () => {  
  ffmpeg.setFfmpegPath(`/usr/bin/ffmpeg`);
  ffmpeg.setFfprobePath(`/usr/bin/ffprobe`);
};

await configureFFMPEG();

const processRawFileToMp4 = async (filePath, outputFolder, jobData) => {
  const fileExt = path.extname(filePath);
  const fileNameWithoutExt = path.basename(filePath, fileExt);

  const outputFileName = `${outputFolder}/${fileNameWithoutExt}.mp4`;

  ffmpeg(filePath)
    .output(outputFileName)
    .on('start', function (commandLine) {
      logger.info('Spawned Ffmpeg with command: ' + commandLine);
    })
    .on('progress', function (progress) {
      if (progress.percent && Math.floor(progress.percent) % 20 === 0) {
        logger.info('Processing: ' + progress.percent + '% done');
      }
    })
    .on('end', async function () {
      logger.info('Finished processing', outputFileName);
      await addQueueItem(QUEUE_EVENTS.VIDEO_PROCESSED, {
        ...jobData,
        completed: true,
        path: outputFileName,
      });
    })
    .on('error', function (err) {
      logger.info('An error occurred: ' + err.message);
    })
    .run();

  generateThumbnail(filePath, `./uploads/thumbnails`, {
    ...jobData,
    completed: true,
  });
  return;
};

const generateThumbnail = async (filePath, outputFolder, jobData) => {
  const fileExt = path.extname(filePath);
  const fileNameWithoutExt = path.basename(filePath, fileExt);
  const outputFileName = `${outputFolder}/${fileNameWithoutExt}.png`;
  ffmpeg(filePath)
    .screenshots({
      timestamps: ['00:01'],
      filename: `${fileNameWithoutExt}.png`,
      folder: `${outputFolder}`,
      // size: '320x240',
    })
    .on('end', async function () {
      await addQueueItem(QUEUE_EVENTS.VIDEO_THUMBNAIL_GENERATED, {
        ...jobData,
        completed: true,
        path: outputFileName,
      });
    });
  return;
};

const processMp4ToHls = async (filePath, outputFolder, jobData) => {
  const fileExt = path.extname(filePath);
  const fileNameWithoutExt = path.basename(filePath, fileExt);

  const outputFileName = `${outputFolder}/${fileNameWithoutExt}.m3u8`;

  ffmpeg.ffprobe(filePath, function (err, metadata) {
    logger.info('metadata', err, metadata);
  });

  ffmpeg(filePath)
    .output(outputFileName)
    .outputOptions([
      '-hls_time', '10',
      '-hls_list_size', '0',
      '-hls_flags', 'delete_segments',
      '-hls_segment_filename',
      outputFolder + '/' + fileNameWithoutExt + '_%03d.ts',
    ])
    .on('start', function (commandLine) {
      logger.info('Spawned Ffmpeg with command: ' + commandLine);
    })
    .on('progress', function (progress) {
      if (progress.percent && Math.floor(progress.percent) % 20 === 0) {
        logger.info('Processing: ' + progress.percent + '% done');
      }
    })
    .on('end', function (x) {
      logger.info('Finished processing', outputFileName, x);
      addQueueItem(QUEUE_EVENTS.VIDEO_HLS_CONVERTED, {
        ...jobData,
        path: outputFileName,
      });
    })
    .on('error', function (err) {
      logger.info('An error occurred: ' + err.message);
    })
    .run();

  return;
};

const getVideoDurationAndResolution = async (filePath) => {
  // if any error occour return error
  // else return video meta data
  return new Promise((resolve, reject) => {
    let videoDuration = 0;
    let videoResolution = {
      height: 0,
      width: 0,
    };
    ffmpeg.ffprobe(filePath, function (err, metadata) {
      if (!err) {
        videoDuration = parseInt(metadata.format.duration);
        videoResolution = {
          height: metadata.streams[0].coded_height,
          width: metadata.streams[0].coded_width,
        };
        resolve({
          videoDuration,
          videoResolution,
        });
        return;
      }
      logger.error(err);
      reject(err);
    });
  });
};

export {
  processRawFileToMp4,
  processMp4ToHls,
  generateThumbnail,
  getVideoDurationAndResolution,
};
