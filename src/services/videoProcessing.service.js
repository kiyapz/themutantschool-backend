// src/services/videoProcessing.service.js
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import { logger } from '../utils/logger.js';
import Video from '../models/video.model.js';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log FFmpeg paths for debugging
logger.info(`Using FFmpeg path: ${ffmpegPath}`);
logger.info(`Using FFprobe path: ${ffprobePath.path}`);

// Base directories for videos
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const ORIGINAL_VIDEOS_DIR = path.join(UPLOADS_DIR, "original");
const PROCESSED_VIDEOS_DIR = path.join(UPLOADS_DIR, "processed");
const HLS_VIDEOS_DIR = path.join(UPLOADS_DIR, "hls");
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, "thumbnails");

// Ensure directories exist
const ensureDirectoriesExist = async () => {
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
    await mkdir(ORIGINAL_VIDEOS_DIR, { recursive: true });
    await mkdir(PROCESSED_VIDEOS_DIR, { recursive: true });
    await mkdir(HLS_VIDEOS_DIR, { recursive: true });
    await mkdir(THUMBNAILS_DIR, { recursive: true });
    logger.info("Video directories created successfully");
    return true;
  } catch (error) {
    logger.error(`Error creating directories: ${error.message}`);
    return false;
  }
};

// Initialize directories
await ensureDirectoriesExist();

/**
 * Check if file exists
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} - True if file exists
 */
const fileExists = async (filePath) => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Check if directory exists
 * @param {string} dirPath - Path to directory
 * @returns {Promise<boolean>} - True if directory exists
 */
const directoryExists = async (dirPath) => {
  try {
    const stats = await fs.promises.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
};

/**
 * Execute FFmpeg command
 * @param {Array} args - FFmpeg command arguments
 * @returns {Promise} - Promise that resolves when command completes
 */
const executeFFmpeg = (args) => {
  return new Promise((resolve, reject) => {
    try {
      logger.debug(`Running FFmpeg with args: ${args.join(' ')}`);
      const ffmpeg = spawn(ffmpegPath, args);
      
      let stdoutData = '';
      let stderrData = '';
      
      ffmpeg.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
      
      ffmpeg.stderr.on('data', (data) => {
        stderrData += data.toString();
        // Log progress (FFmpeg outputs progress to stderr)
        const progressMatch = data.toString().match(/time=(\d+:\d+:\d+\.\d+)/);
        if (progressMatch) {
          logger.debug(`FFmpeg progress: ${progressMatch[1]}`);
        }
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(stdoutData);
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}: ${stderrData}`));
        }
      });
      
      ffmpeg.on('error', (err) => {
        reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
      });
    } catch (error) {
      reject(new Error(`Failed to execute FFmpeg: ${error.message}`));
    }
  });
};

/**
 * Get video information using FFprobe
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Object>} - Video information
 */
const getVideoInfo = (videoPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Check if file exists first
      if (!fs.existsSync(videoPath)) {
        return reject(new Error(`Video file not found: ${videoPath}`));
      }
      
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath
      ];
      
      logger.debug(`Running FFprobe with path: ${ffprobePath.path} and video: ${videoPath}`);
      const ffprobe = spawn(ffprobePath.path, args);
      
      let outputData = '';
      
      ffprobe.stdout.on('data', (data) => {
        outputData += data.toString();
      });
      
      ffprobe.stderr.on('data', (data) => {
        logger.debug(`FFprobe stderr: ${data.toString()}`);
      });
      
      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(outputData);
            resolve(info);
          } catch (error) {
            reject(new Error(`Failed to parse FFprobe output: ${error.message}`));
          }
        } else {
          reject(new Error(`FFprobe process exited with code ${code}`));
        }
      });
      
      ffprobe.on('error', (err) => {
        reject(new Error(`Failed to start FFprobe process: ${err.message}`));
      });
    } catch (error) {
      reject(new Error(`Error in getVideoInfo: ${error.message}`));
    }
  });
};

/**
 * Process video to MP4 format
 * @param {string} videoId - Video ID
 * @param {string} inputPath - Input video path
 * @returns {Promise<string>} - Path to processed video
 */
const processVideoToMp4 = async (videoId, inputPath) => {
  try {
    logger.info(`Processing video to MP4: ${videoId}`);
    
    // Check if input file exists
    if (!(await fileExists(inputPath))) {
      throw new Error(`Input video file not found: ${inputPath}`);
    }
    
    // Update video status
    await Video.findByIdAndUpdate(videoId, {
      status: "PROCESSING",
      $push: { history: { status: "PROCESSING", createdAt: new Date() } },
      processingStats: {
        startTime: new Date(),
        success: false
      }
    });
    
    // Get video info
    const videoInfo = await getVideoInfo(inputPath);
    
    // Extract video metadata
    const videoStream = videoInfo.streams.find(stream => stream.codec_type === 'video');
    const audioStream = videoInfo.streams.find(stream => stream.codec_type === 'audio');
    
    const width = videoStream?.width || 1920;
    const height = videoStream?.height || 1080;
    const duration = parseFloat(videoInfo.format.duration) || 0;
    
    // Output path for processed MP4
    const outputPath = path.join(PROCESSED_VIDEOS_DIR, `${videoId}.mp4`);
    
    // FFmpeg arguments for MP4 conversion
    const args = [
      '-i', inputPath,
      '-c:v', 'libx264',      // Video codec
      '-preset', 'medium',    // Encoding speed/compression trade-off
      '-crf', '23',           // Constant Rate Factor (quality)
      '-c:a', 'aac',          // Audio codec
      '-b:a', '128k',         // Audio bitrate
      '-movflags', '+faststart', // Optimize for web playback
      '-y',                   // Overwrite output file
      outputPath
    ];
    
    // Execute FFmpeg command
    await executeFFmpeg(args);
    
    // Generate thumbnail
    const thumbnailPath = await generateThumbnail(videoId, inputPath);
    
    // Update video with processed info
    await Video.findByIdAndUpdate(videoId, {
      processedPath: outputPath,
      thumbnailPath: thumbnailPath,
      duration: duration,
      resolution: { width, height },
      status: "PROCESSED",
      $push: { history: { status: "PROCESSED", createdAt: new Date() } }
    });
    
    logger.info(`Video processed successfully: ${videoId}`);
    return outputPath;
  } catch (error) {
    logger.error(`Error processing video to MP4: ${error.message}`);
    
    // Update video status to FAILED
    await Video.findByIdAndUpdate(videoId, {
      status: "FAILED",
      $push: { history: { status: "FAILED", createdAt: new Date() } },
      processingStats: {
        endTime: new Date(),
        success: false,
        error: error.message
      }
    });
    
    throw error;
  }
};

/**
 * Generate video thumbnail
 * @param {string} videoId - Video ID
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Path to thumbnail
 */
const generateThumbnail = async (videoId, videoPath) => {
  try {
    logger.info(`Generating thumbnail for video: ${videoId}`);
    
    // Check if input file exists
    if (!(await fileExists(videoPath))) {
      throw new Error(`Input video file not found for thumbnail: ${videoPath}`);
    }
    
    const thumbnailPath = path.join(THUMBNAILS_DIR, `${videoId}.png`);
    
    // FFmpeg arguments for thumbnail generation
    const args = [
      '-i', videoPath,
      '-ss', '00:00:05',      // Seek to 5 seconds
      '-vframes', '1',        // Extract 1 frame
      '-vf', 'scale=640:-1',  // Scale width to 640px, maintain aspect ratio
      '-y',                   // Overwrite output file
      thumbnailPath
    ];
    
    // Execute FFmpeg command
    await executeFFmpeg(args);
    
    // Create a thumbnailUrl that can be used in the frontend
    const thumbnailUrl = `/api/v1/videos/${videoId}/thumbnail`;
    
    // Update the video with the thumbnailUrl
    await Video.findByIdAndUpdate(videoId, {
      thumbnailUrl: thumbnailUrl
    });
    
    logger.info(`Thumbnail generated successfully: ${videoId}`);
    return thumbnailPath;
  } catch (error) {
    logger.error(`Error generating thumbnail: ${error.message}`);
    throw error;
  }
};

/**
 * Create HLS renditions for adaptive bitrate streaming
 * @param {string} videoId - Video ID
 * @param {string} inputPath - Input video path (processed MP4)
 * @returns {Promise<string>} - Path to HLS master playlist
 */
const createHlsRenditions = async (videoId, inputPath) => {
  try {
    logger.info(`Creating HLS renditions for video: ${videoId}`);
    
    // Check if input file exists
    if (!(await fileExists(inputPath))) {
      throw new Error(`Input video file not found for HLS: ${inputPath}`);
    }
    
    // Check if HLS directory exists
    if (!(await directoryExists(HLS_VIDEOS_DIR))) {
      await mkdir(HLS_VIDEOS_DIR, { recursive: true });
      logger.info(`Created HLS directory: ${HLS_VIDEOS_DIR}`);
    }
    
    // Get the video from the database
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error(`Video not found in database: ${videoId}`);
    }
    
    // Update video status
    await Video.findByIdAndUpdate(videoId, {
      status: "PROCESSING",
      $push: { history: { status: "PROCESSING", createdAt: new Date() } }
    });
    
    // Create output directory for this video's HLS files
    const hlsOutputDir = path.join(HLS_VIDEOS_DIR, videoId);
    await mkdir(hlsOutputDir, { recursive: true });
    
    // Define rendition settings for adaptive bitrate
    const renditions = [
      {
        name: '240p',
        resolution: '426x240',
        videoBitrate: '400k',
        audioBitrate: '64k',
        maxrate: '500k',
        bufsize: '800k'
      },
      {
        name: '360p',
        resolution: '640x360',
        videoBitrate: '800k',
        audioBitrate: '96k',
        maxrate: '1000k',
        bufsize: '1600k'
      },
      {
        name: '480p',
        resolution: '854x480',
        videoBitrate: '1400k',
        audioBitrate: '128k',
        maxrate: '1750k',
        bufsize: '2800k'
      },
      {
        name: '720p',
        resolution: '1280x720',
        videoBitrate: '2800k',
        audioBitrate: '128k',
        maxrate: '3500k',
        bufsize: '5600k'
      }
    ];
    
    // Store rendition information in the database
    const renditionData = renditions.map(rendition => ({
      name: rendition.name,
      resolution: rendition.resolution,
      videoBitrate: rendition.videoBitrate,
      audioBitrate: rendition.audioBitrate,
      path: path.join(hlsOutputDir, `${rendition.name}.m3u8`)
    }));
    
    await Video.findByIdAndUpdate(videoId, {
      renditions: renditionData
    });
    
    // Build FFmpeg arguments for HLS conversion with multiple renditions
    const args = [
      '-i', inputPath,
      '-preset', 'slow',
      '-g', '48',             // Keyframe interval (2 seconds at 24fps)
      '-sc_threshold', '0',   // Disable scene change detection
      '-map', '0:v:0',        // Map video stream
      '-map', '0:a:0',        // Map audio stream
    ];
    
    // Add arguments for each rendition
    renditions.forEach(rendition => {
      args.push(
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', rendition.audioBitrate,
        '-b:v', rendition.videoBitrate,
        '-maxrate', rendition.maxrate,
        '-bufsize', rendition.bufsize,
        '-vf', `scale=${rendition.resolution}`,
        '-f', 'hls',
        '-hls_time', '6',     // Segment duration in seconds
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', path.join(hlsOutputDir, `${rendition.name}_%03d.ts`),
        path.join(hlsOutputDir, `${rendition.name}.m3u8`)
      );
    });
    
    // Execute FFmpeg command
    await executeFFmpeg(args);
    
    // Define masterPlaylistPath BEFORE using it
    const masterPlaylistPath = path.join(HLS_VIDEOS_DIR, `${videoId}.m3u8`);
    if (!masterPlaylistPath) {
      throw new Error(`Failed to create master playlist path for video: ${videoId}`);
    }
    
    // Create master playlist content
    let masterPlaylistContent = '#EXTM3U\n#EXT-X-VERSION:3\n';
    
    renditions.forEach(rendition => {
      const [width, height] = rendition.resolution.split('x');
      masterPlaylistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(rendition.videoBitrate) * 1000},RESOLUTION=${rendition.resolution}\n`;
      masterPlaylistContent += `${videoId}/${rendition.name}.m3u8\n`;
    });
    
    // Write master playlist to file
    fs.writeFileSync(masterPlaylistPath, masterPlaylistContent);
    
    // Create a hlsUrl that can be used in the frontend
    const hlsUrl = `/api/v1/videos/${videoId}/hls/${videoId}.m3u8`;
    
    // Update video with HLS path and URL
    await Video.findByIdAndUpdate(videoId, {
      hlsPath: masterPlaylistPath,
      hlsUrl: hlsUrl,
      status: "PUBLISHED",
      $push: { history: { status: "PUBLISHED", createdAt: new Date() } },
      processingStats: {
        endTime: new Date(),
        success: true,
        duration: (new Date() - new Date(video.processingStats?.startTime || new Date())) / 1000 // duration in seconds
      }
    });
    
    logger.info(`HLS renditions created successfully: ${videoId}`);
    return masterPlaylistPath;
  } catch (error) {
    logger.error(`Error creating HLS renditions: ${error.message}`);
    
    // Update video status to FAILED
    await Video.findByIdAndUpdate(videoId, {
      status: "FAILED",
      $push: { history: { status: "FAILED", createdAt: new Date() } },
      processingStats: {
        endTime: new Date(),
        success: false,
        error: error.message
      }
    });
    
    throw error;
  }
};

/**
 * Process video completely (MP4 conversion and HLS renditions)
 * @param {string} videoId - Video ID
 * @returns {Promise<Object>} - Processing result
 */
export const processVideo = async (videoId) => {
  try {
    logger.info(`Starting complete video processing for: ${videoId}`);
    
    // Get video from database
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }
    
    // Check if original path exists
    if (!(await fileExists(video.originalPath))) {
      throw new Error(`Original video file not found: ${video.originalPath}`);
    }
    
    // Process to MP4
    const mp4Path = await processVideoToMp4(videoId, video.originalPath);
    
    // Create HLS renditions
    const hlsPath = await createHlsRenditions(videoId, mp4Path);
    
    return {
      videoId,
      mp4Path,
      hlsPath,
      status: "PUBLISHED"
    };
  } catch (error) {
    logger.error(`Complete video processing failed: ${error.message}`);
    throw error;
  }
};

export default {
  processVideo,
  processVideoToMp4,
  createHlsRenditions,
  generateThumbnail,
  getVideoInfo
};
