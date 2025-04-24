// src/controllers/video.controller.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import Video from "../models/video.model.js";
import tryCatch from "../utils/trycatch.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { mkdir } from "fs/promises";
import videoQueueService from "../services/videoQueueService.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert fs functions to promises
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch (error) {
    return false;
  }
};

// Base directories for videos
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const ORIGINAL_VIDEOS_DIR = path.join(UPLOADS_DIR, "original");
const PROCESSED_VIDEOS_DIR = path.join(UPLOADS_DIR, "processed");
const HLS_VIDEOS_DIR = path.join(UPLOADS_DIR, "hls");
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, "thumbnails");

// Create necessary directories
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

export const uploadVideo = tryCatch(async (req, res) => {
  if (!req.file) {
    return res.status(400).json(new apiError(400, "No video file uploaded"));
  }

  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json(new apiError(400, "Video title is required"));
  }
  const absolutePath = path.resolve(req.file.path);
  const video = new Video({
    title,
    description,
    filename: req.file.filename,
    originalPath: absolutePath,
    status: "UPLOADED",
    history: [{ status: "UPLOADED", createdAt: new Date() }],
  });

  // Save to database
  await video.save();

  // Queue video for processing
  await videoQueueService.queueVideoProcessing(video._id.toString());

  // Return JSON response with video ID
  res.status(201).json({
    success: true,
    message: "Video uploaded successfully and queued for processing",
    data: {
      id: video._id,
      title: video.title,
      status: video.status,
    },
  });
});
export const getVideoProcessingStatus = tryCatch(async (req, res) => {
  const status = await videoQueueService.getQueueStatus();

  res
    .status(200)
    .json(new apiResponse("Video processing queue status", status));
});

/**
 * Manually trigger video processing
 */
export const triggerVideoProcessing = tryCatch(async (req, res) => {
  const { id } = req.params;

  // Check if video exists
  const video = await Video.findById(id);
  if (!video) {
    return res.status(404).json(new apiError(404, "Video not found"));
  }

  // Queue video for processing
  const result = await videoQueueService.queueVideoProcessing(id);

  res.status(200).json(new apiResponse("Video queued for processing", result));
});
// export const uploadVideo = tryCatch(async (req, res) => {
//     if (!req.file) {
//         return res.status(400).json(
//             new apiError(400, "No video file uploaded")
//         );
//     }

//     const { title, description } = req.body;

//     if (!title) {
//         return res.status(400).json(
//             new apiError(400, "Video title is required")
//         );
//     }

//     // Convert relative path to absolute path
//     const absolutePath = path.resolve(req.file.path);

//     // Create a new video document
//     const video = new Video({
//         title,
//         description,
//         filename: req.file.filename,
//         originalPath: absolutePath,
//         status: "UPLOADED",
//         history: [
//             { status: "UPLOADED", createdAt: new Date() }
//         ]
//     });

//     // Save to database
//     await video.save();

//     // Return JSON response with video ID
//     res.status(201).json({
//         success: true,
//         message: "Video uploaded successfully",
//         data: {
//             id: video._id,
//             title: video.title,
//             status: video.status
//         }
//     });
// });

/**
 * Get all available videos
 */
export const getVideoLibrary = tryCatch(async (req, res) => {
  // Parse query parameters for pagination and search
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";

  // Build search query
  const searchQuery = search ? { $text: { $search: search } } : {};

  // Option 1: Get videos from database
  const videos = await Video.find(searchQuery)
    .select("title description duration thumbnailUrl hlsPath status createdAt")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  // Get total count for pagination
  const totalVideos = await Video.countDocuments(searchQuery);

  // Option 2: Get videos from filesystem if no database results
  if (!videos || videos.length === 0) {
    try {
      // Check if directory exists first
      if (await exists(HLS_VIDEOS_DIR)) {
        const files = await readdir(HLS_VIDEOS_DIR);
        const m3u8Files = files.filter((file) => file.endsWith(".m3u8"));

        const videoList = m3u8Files.map((file) => {
          const id = path.basename(file, ".m3u8");
          return {
            id,
            title: id,
            hlsPath: `/api/v1/videos/${id}/hls/${file}`,
            streamUrl: `/api/v1/videos/${id}/stream`,
            thumbnailUrl: `/api/v1/videos/${id}/thumbnail`,
            status: "PUBLISHED",
            createdAt: new Date(),
          };
        });

        // Apply pagination to filesystem results
        const paginatedVideos = videoList.slice(
          (page - 1) * limit,
          page * limit
        );

        return res.status(200).json(
          new apiResponse("Videos fetched successfully", {
            lastUpdated: new Date(),
            videos: paginatedVideos,
            pagination: {
              total: videoList.length,
              page,
              limit,
              pages: Math.ceil(videoList.length / limit),
            },
          })
        );
      }
    } catch (error) {
      // If directory doesn't exist or can't be read, return empty list
      logger.warn(`Error reading video directory: ${error.message}`);
    }

    // Return empty list if no videos found
    return res.status(200).json(
      new apiResponse("No videos found", {
        lastUpdated: new Date(),
        videos: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
      })
    );
  }

  // Format videos for response
  const formattedVideos = videos.map((video) => ({
    id: video._id,
    title: video.title,
    description: video.description,
    status: video.status,
    duration: video.duration,
    thumbnailUrl: video.thumbnailUrl || `/api/v1/videos/${video._id}/thumbnail`,
    hlsPath:
      video.hlsPath || `/api/v1/videos/${video._id}/hls/${video._id}.m3u8`,
    streamUrl: `/api/v1/videos/${video._id}/stream`,
    createdAt: video.createdAt,
  }));

  return res.status(200).json(
    new apiResponse("Videos fetched successfully", {
      lastUpdated: new Date(),
      videos: formattedVideos,
      pagination: {
        total: totalVideos,
        page,
        limit,
        pages: Math.ceil(totalVideos / limit),
      },
    })
  );
});

/**
 * Get video metadata
 */
export const getVideoMetadata = tryCatch(async (req, res) => {
  const { id } = req.params;

  // Try to get from database first
  const video = await Video.findById(id);

  if (video) {
    // Format video for response
    const videoData = {
      id: video._id,
      title: video.title,
      description: video.description,
      status: video.status,
      duration: video.duration,
      resolution: video.resolution,
      thumbnailUrl:
        video.thumbnailUrl || `/api/v1/videos/${video._id}/thumbnail`,
      hlsUrl:
        video.hlsPath || `/api/v1/videos/${video._id}/hls/${video._id}.m3u8`,
      streamUrl: `/api/v1/videos/${video._id}/stream`,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    };

    return res
      .status(200)
      .json(new apiResponse("Video metadata fetched successfully", videoData));
  }

  // Fallback to filesystem
  const hlsPath = path.join(HLS_VIDEOS_DIR, `${id}.m3u8`);
  const mp4Path = path.join(PROCESSED_VIDEOS_DIR, `${id}.mp4`);

  if (!(await exists(hlsPath)) && !(await exists(mp4Path))) {
    return res.status(404).json(new apiError(404, "Video not found"));
  }

  // Basic metadata
  const metadata = {
    id,
    title: id,
    hlsUrl: `/api/v1/videos/${id}/hls/${id}.m3u8`,
    streamUrl: `/api/v1/videos/${id}/stream`,
    thumbnailUrl: `/api/v1/videos/${id}/thumbnail`,
    status: "PUBLISHED",
    createdAt: new Date(),
  };

  res
    .status(200)
    .json(new apiResponse("Video metadata fetched successfully", metadata));
});

/**
 * Stream video in MP4 format with chunked streaming
 */
export const streamVideo = tryCatch(async (req, res) => {
  const { id } = req.params;

  logger.info(`Attempting to stream video with ID: ${id}`);

  // Try to get from database first
  const video = await Video.findById(id);
  let videoPath;

  if (video && video.processedPath) {
    videoPath = video.processedPath;
    logger.info(`Found video in database with processed path: ${videoPath}`);
  } else {
    // Fallback to filesystem
    videoPath = path.join(PROCESSED_VIDEOS_DIR, `${id}.mp4`);
    logger.info(`Checking filesystem at: ${videoPath}`);
  }

  // Check if file exists
  const fileExists = await exists(videoPath);
  logger.info(`File exists at ${videoPath}: ${fileExists}`);

  if (!fileExists) {
    // Try original path as a last resort
    if (video && video.originalPath) {
      // Convert relative path to absolute path if needed
      if (!path.isAbsolute(video.originalPath)) {
        videoPath = path.join(__dirname, "../../", video.originalPath);
        logger.info(`Converting to absolute path: ${videoPath}`);
      } else {
        videoPath = video.originalPath;
      }

      logger.info(`Trying original path: ${videoPath}`);

      if (!(await exists(videoPath))) {
        logger.error(`Video file not found in any location for ID: ${id}`);
        return res
          .status(404)
          .json(new apiError(404, "Video file not found in any location"));
      }
    } else {
      logger.error(`Video not found for ID: ${id}`);
      return res.status(404).json(new apiError(404, "Video not found"));
    }
  }

  // Get video stats
  const stats = await stat(videoPath);
  const fileSize = stats.size;
  const range = req.headers.range;

  if (range) {
    // Parse range
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Validate range
    if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize) {
      logger.error(`Invalid range request: ${range}`);
      return res.status(416).send("Range Not Satisfiable");
    }

    const chunkSize = end - start + 1;

    logger.info(`Streaming range request: bytes ${start}-${end}/${fileSize}`);

    // Create read stream for the specific chunk
    const stream = fs.createReadStream(videoPath, { start, end });

    // Handle stream errors
    stream.on("error", (error) => {
      logger.error(`Stream error: ${error.message}`);
      if (!res.headersSent) {
        return res.status(500).json(new apiError(500, "Error streaming video"));
      }
    });

    // Set headers for partial content
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });

    // Pipe the stream to the response
    stream.pipe(res);
  } else {
    logger.info(`Streaming full video file: ${fileSize} bytes`);

    // No range requested, send entire file
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
    });

    // Create read stream for the entire file
    const stream = fs.createReadStream(videoPath);

    // Handle stream errors
    stream.on("error", (error) => {
      logger.error(`Stream error: ${error.message}`);
      if (!res.headersSent) {
        return res.status(500).json(new apiError(500, "Error streaming video"));
      }
    });

    // Pipe the stream to the response
    stream.pipe(res);
  }
});

/**
 * Stream HLS video segments
 */
export const streamHlsVideo = tryCatch(async (req, res) => {
  const { id, filename } = req.params;

  logger.info(`HLS stream request for video ${id}, file: ${filename}`);

  // Ensure the filename is safe (no path traversal)
  const safeFilename = path.basename(filename);

  // Determine the file path
  let filePath;

  if (safeFilename.endsWith(".m3u8")) {
    // For the manifest file
    filePath = path.join(HLS_VIDEOS_DIR, `${id}.m3u8`);
  } else if (safeFilename.endsWith(".ts")) {
    // For the segment files
    filePath = path.join(HLS_VIDEOS_DIR, safeFilename);
  } else {
    logger.error(`Invalid file type requested: ${safeFilename}`);
    return res
      .status(400)
      .json(new apiError(400, "Invalid file type requested"));
  }

  // Check if the file exists
  if (!(await exists(filePath))) {
    logger.error(`HLS file not found: ${filePath}`);
    return res.status(404).json(new apiError(404, "File not found"));
  }

  // Set appropriate content type
  const contentType = safeFilename.endsWith(".m3u8")
    ? "application/vnd.apple.mpegurl"
    : "video/mp2t";

  // Set headers
  res.setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Get file stats
  const stats = await stat(filePath);

  // Stream the file
  const stream = fs.createReadStream(filePath);

  // Handle stream errors
  stream.on("error", (error) => {
    logger.error(`HLS stream error: ${error.message}`);
    if (!res.headersSent) {
      return res
        .status(500)
        .json(new apiError(500, "Error streaming HLS content"));
    }
  });

  // Pipe the stream to the response
  stream.pipe(res);
});

/**
 * Get video thumbnail
 */
export const getVideoThumbnail = tryCatch(async (req, res) => {
  const { id } = req.params;

  logger.info(`Thumbnail request for video ${id}`);

  // Try to get from database first
  const video = await Video.findById(id);
  let thumbnailPath;

  if (video && video.thumbnailPath) {
    thumbnailPath = video.thumbnailPath;
    logger.info(`Found thumbnail in database: ${thumbnailPath}`);
  } else {
    // Fallback to filesystem
    thumbnailPath = path.join(THUMBNAILS_DIR, `${id}.png`);
    logger.info(`Checking filesystem for thumbnail: ${thumbnailPath}`);
  }

  if (!(await exists(thumbnailPath))) {
    logger.error(`Thumbnail not found: ${thumbnailPath}`);
    return res.status(404).json(new apiError(404, "Thumbnail not found"));
  }

  // Set content type
  res.setHeader("Content-Type", "image/png");

  // Stream the thumbnail
  const stream = fs.createReadStream(thumbnailPath);

  // Handle stream errors
  stream.on("error", (error) => {
    logger.error(`Thumbnail stream error: ${error.message}`);
    if (!res.headersSent) {
      return res
        .status(500)
        .json(new apiError(500, "Error streaming thumbnail"));
    }
  });

  stream.pipe(res);
});

/**
 * Delete a video
 */
export const deleteVideo = tryCatch(async (req, res) => {
  const { id } = req.params;

  logger.info(`Delete request for video ${id}`);

  // Find the video in the database
  const video = await Video.findById(id);

  if (!video) {
    logger.error(`Video not found for deletion: ${id}`);
    return res.status(404).json(new apiError(404, "Video not found"));
  }

  // Delete associated files
  const filesToDelete = [
    video.originalPath,
    video.processedPath,
    video.hlsPath,
    video.thumbnailPath,
  ].filter(Boolean); // Filter out undefined paths

  // Delete files from filesystem
  for (const filePath of filesToDelete) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted file: ${filePath}`);
      }
    } catch (error) {
      logger.error(`Error deleting file ${filePath}: ${error.message}`);
    }
  }

  // Delete the video from the database
  await Video.findByIdAndDelete(id);
  logger.info(`Video deleted from database: ${id}`);

  return res
    .status(200)
    .json(new apiResponse("Video deleted successfully", { id }));
});

/**
 * Update video metadata
 */
export const updateVideoMetadata = tryCatch(async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  logger.info(`Update metadata request for video ${id}`);

  // Find the video
  const video = await Video.findById(id);

  if (!video) {
    logger.error(`Video not found for metadata update: ${id}`);
    return res.status(404).json(new apiError(404, "Video not found"));
  }

  // Update fields if provided
  if (title) video.title = title;
  if (description) video.description = description;
  if (
    status &&
    ["UPLOADED", "PROCESSING", "PROCESSED", "PUBLISHED", "FAILED"].includes(
      status
    )
  ) {
    video.status = status;
    // Add to history
    video.history.push({
      status,
      createdAt: new Date(),
    });
  }

  // Save changes
  await video.save();
  logger.info(`Video metadata updated: ${id}`);

  res
    .status(200)
    .json(new apiResponse("Video metadata updated successfully", video));
});

/**
 * Get video playback statistics
 */
export const getVideoStats = tryCatch(async (req, res) => {
  const { id } = req.params;

  logger.info(`Stats request for video ${id}`);

  // Find the video
  const video = await Video.findById(id);

  if (!video) {
    logger.error(`Video not found for stats: ${id}`);
    return res.status(404).json(new apiError(404, "Video not found"));
  }

  // Here you would normally fetch statistics from your analytics system
  // This is a placeholder implementation
  const stats = {
    videoId: id,
    title: video.title,
    views: 0,
    uniqueViewers: 0,
    averageWatchTime: 0,
    completionRate: 0,
    popularSegments: [],
  };

  res
    .status(200)
    .json(new apiResponse("Video statistics fetched successfully", stats));
});
