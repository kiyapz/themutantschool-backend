
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDb from "./db/dbConnection.js";
import { logger } from "./utils/logger.js";
import eventEmitter from "./utils/event-manager.js";
import { NOTIFY_EVENTS } from "./queues/constants.js";
import { createRequire } from "module"; // Add this for compatibility

// Create require function for compatibility with CommonJS modules
const require = createRequire(import.meta.url);

// Load environment variables
dotenv.config({
    path: "./.env"
});

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
    logger.info('A user connected');
    logger.info(`Socket ID: ${socket.id}`);
});

// Setup application modules
const setup = async () => {
    try {
        // Import and setup video module - wrap in try/catch
        try {
            const { setup: setupVideoModule } = await import('./models/video/controller.js');
            setupVideoModule(app);
        } catch (error) {
            logger.warn(`Video module setup error: ${error.message}`);
            // Continue execution
        }
        
        // Setup queue listeners with error handling
        try {
            const { listenQueueEvent } = await import('./queues/worker.js');
            await listenQueueEvent(NOTIFY_EVENTS.NOTIFY_VIDEO_HLS_CONVERTED);
            
            // Setup event handlers
            eventEmitter.on(NOTIFY_EVENTS.NOTIFY_VIDEO_HLS_CONVERTED, (data) => {
                logger.info('NOTIFY_EVENTS.NOTIFY_VIDEO_HLS_CONVERTED Event handler', data);
                io.emit('hello', data);
            });
        } catch (error) {
            logger.warn(`Queue setup error: ${error.message}`);
            // Continue execution
        }
        
        logger.info('Application setup completed');
    } catch (error) {
        logger.error(`Setup error: ${error.message}`);
        // Don't exit process, try to continue
        logger.info('Continuing with limited functionality');
    }
};

// Start the server
server.listen(PORT, async () => {
    logger.info(`Server is running at http://127.0.0.1:${PORT}`);
    
    // Connect to database
    await connectDb();
    
    // Setup application modules
    await setup();
    
    // Fallback route handler
    app.use('/', (req, res) => {
        logger.info(`Request received at ${new Date()}`);
        logger.info('Request body:', req.body);
        res.send(`Request received at ${new Date()}`);
    });
    
    logger.info(`Application started at ${new Date().toTimeString()}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger.error(`Unhandled Rejection: ${error.message}`);
    // Log error but don't exit process
    logger.error(error.stack);
});
