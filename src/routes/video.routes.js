// src/routes/video.routes.js
import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { 
    getVideoLibrary,
    getVideoMetadata,
    deleteVideo,
    streamVideo,
    streamHlsVideo,
    getVideoThumbnail,
    uploadVideo,
    updateVideoMetadata,
    getVideoStats,
    getVideoProcessingStatus,
    triggerVideoProcessing
} from "../controller/video.controller.js";
import { validateObjectId } from "../middleware/validation.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

/**
 * @swagger
 * /videos/player:
 *   get:
 *     summary: Get HTML5 video player page
 *     tags: [Videos]
 *     responses:
 *       200:
 *         description: HTML video player
 */
router.get("/player", (req, res) => {
    res.sendFile(path.join(__dirname, "../../public/player.html"));
});

/**
 * @swagger
 * /videos/queue/status:
 *   get:
 *     summary: Get video processing queue status
 *     tags: [Videos]
 *     responses:
 *       200:
 *         description: Queue status
 */
router.get("/queue/status", getVideoProcessingStatus);

/**
 * @swagger
 * /videos:
 *   get:
 *     summary: Get list of all videos
 *     tags: [Videos]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: List of videos
 */
router.get("/", getVideoLibrary);

/**
 * @swagger
 * /videos:
 *   post:
 *     summary: Upload a new video
 *     tags: [Videos]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - video
 *               - title
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video file
 *               title:
 *                 type: string
 *                 description: Video title
 *               description:
 *                 type: string
 *                 description: Video description
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *       400:
 *         description: Invalid input
 */
router.post("/", upload.single("video"), uploadVideo);

/**
 * @swagger
 * /videos/{id}/process:
 *   post:
 *     summary: Manually trigger video processing
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video queued for processing
 *       404:
 *         description: Video not found
 */
router.post("/:id/process", validateObjectId("id"), triggerVideoProcessing);

/**
 * @swagger
 * /videos/{id}:
 *   get:
 *     summary: Get video details by ID
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video details
 *       404:
 *         description: Video not found
 */
router.get("/:id", validateObjectId("id"), getVideoMetadata);

/**
 * @swagger
 * /videos/{id}:
 *   patch:
 *     summary: Update video metadata
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Video updated
 *       404:
 *         description: Video not found
 */
router.patch("/:id", validateObjectId("id"), updateVideoMetadata);

/**
 * @swagger
 * /videos/{id}:
 *   delete:
 *     summary: Delete a video
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video deleted
 *       404:
 *         description: Video not found
 */
router.delete("/:id", validateObjectId("id"), deleteVideo);

/**
 * @swagger
 * /videos/{id}/stream:
 *   get:
 *     summary: Stream video in MP4 format
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       206:
 *         description: Partial content (video stream)
 *       404:
 *         description: Video not found
 */
router.get("/:id/stream", validateObjectId("id"), streamVideo);

/**
 * @swagger
 * /videos/{id}/hls/{filename}:
 *   get:
 *     summary: Stream HLS video segments
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: HLS segment filename
 *     responses:
 *       200:
 *         description: HLS segment
 *       404:
 *         description: Segment not found
 */
router.get("/:id/hls/:filename", streamHlsVideo);

/**
 * @swagger
 * /videos/{id}/thumbnail:
 *   get:
 *     summary: Get video thumbnail
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video thumbnail
 *       404:
 *         description: Thumbnail not found
 */
router.get("/:id/thumbnail", validateObjectId("id"), getVideoThumbnail);

/**
 * @swagger
 * /videos/{id}/stats:
 *   get:
 *     summary: Get video playback statistics
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video statistics
 *       404:
 *         description: Video not found
 */
router.get("/:id/stats", validateObjectId("id"), getVideoStats);

export default router;
