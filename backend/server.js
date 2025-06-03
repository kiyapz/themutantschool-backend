import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { logger } from "./utils/logger.js";

const PORT = process.env.PORT || 3001;

// Connect to DB
connectDb();

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("💥 Unhandled Rejection at:", promise);
  logger.error("Reason:", reason);

  server.close(() => {
    process.exit(1);
  });
});

// Optional: Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("💥 Uncaught Exception:", err);
  process.exit(1);
});
