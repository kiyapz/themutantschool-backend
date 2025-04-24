import express from "express";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./utils/logger.js";
import videoRouter from "./routes/video.routes.js"; 
import { swaggerUi, swaggerSpec } from "./swagger.js";
import videoProcessingService from './services/videoProcessing.service.js';
import videoQueueService from './services/videoQueueService.js';
import Video from './models/video.model.js'; // Add this import
// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(compression());
app.use(
  cors({
      origin: [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:5000",
          "http://127.0.0.1:5000"
      ],
      credentials: true,
  })
);

// Logging middleware
const morganMiddleware = morgan(
    ':method :url :status :res[content-length] - :response-time ms',
    {
        stream: {
            write: (message) => logger.http(message.trim()),
        },
    }
);
app.use(morganMiddleware);

// Static files
app.use('/thumbnails', express.static(path.join(__dirname, '../uploads/thumbnails')));
app.use('/public', express.static(path.join(__dirname, '../public')));


// Swagger docs route
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes

app.use("/api/v1/videos", videoRouter); 

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/upload.html'));
});
app.use('/player/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/player.html'));
});
const initializeVideoProcessing = async () => {
  try {
    logger.info('Initializing video processing service...');
    
    if (!Video) {
      throw new Error('Video model is not defined');
    }
    
    // Check for unprocessed videos
    const unprocessedVideos = await Video.find({
      status: { $in: ['UPLOADED', 'FAILED'] }
    });
    
    if (unprocessedVideos.length > 0) {
      logger.info(`Found ${unprocessedVideos.length} unprocessed videos. Queueing for processing...`);
      
      for (const video of unprocessedVideos) {
        await videoQueueService.queueVideoProcessing(video._id.toString());
      }
    }
    
    logger.info('Video processing service initialized successfully');
  } catch (error) {
    logger.error(`Error initializing video processing service: ${error.message}`);
  }
};


// Call initialization after database connection
// Add this to your server startup code
await initializeVideoProcessing();
export default app;
