// // app.js
// import express from "express";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import { swaggerUi, swaggerSpec } from "./swagger.js";

// const app = express();

// app.use(
//     cors({
//       origin: [
//         "http://localhost:3000",
//         "http://127.0.0.1:3000",
//         "http://localhost:5000",
//         "http://127.0.0.1:5000"
//       ],
//       credentials: true,
//     })
//   );
// app.use(express.json({ limit: "16kb" }));
// app.use(express.urlencoded({ limit: "16kb", extended: true }));
// app.use(cookieParser());

// // Swagger docs route
// app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// // Import all routes
// import instructorRouter from "./routes/instructor.routes.js";
// import managementRouter from "./routes/management.routes.js";
// import courseRouter from "./routes/course.routes.js";

// import searchRouter from "./routes/search.routes.js";
// import quizRouter from "./routes/quiz.routes.js";
// import discussionRouter from "./routes/discussion.routes.js";
// import analyticsRouter from "./routes/analytics.routes.js";

// // Use routes
// app.use("/api/v1/instructor", instructorRouter);
// app.use("/api/v1/manage", managementRouter);
// app.use("/api/v1/courses", courseRouter);
// app.use("/api/v1/search", searchRouter);
// app.use("/api/v1/quiz", quizRouter);
// app.use("/api/v1/discussions", discussionRouter);
// app.use("/api/v1/analytics", analyticsRouter);

// export default app;













// File: src/app.js
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
