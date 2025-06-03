import express from "express";
import helmet from "helmet";
import cors from "cors";
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";
import rateLimit from "express-rate-limit";
import RateLimitRedisStore from "rate-limit-redis";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/apiErrors.js";

export const app = express();

// Redis setup
const redisClient = new Redis(process.env.REDIS_URL);
redisClient.on("error", (err) => {
  logger.error("Redis error:", err);
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging incoming requests
app.use((req, res, next) => {
  logger.info(`Received a ${req.method} request to ${req.url}`);

  if (
    req.body &&
    typeof req.body === "object" &&
    Object.keys(req.body).length > 0
  ) {
    logger.info(`Request Body: ${JSON.stringify(req.body)}`);
  }

  next();
});

// 🌐 Global Rate Limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 5, // requests
  duration: 1, // per second
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn("Rate Limit exceeded for IP", req.ip);
      res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});

// 🔐 Sensitive Endpoint Rate Limiter
const sensitiveEndpointLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("Rate Limit exceeded for IP", req.ip);
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  store: new RateLimitRedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});
app.use("/", (req, res) => {
  res.send({ message: "Hello World!" });
});
// 404 handler (for unmatched routes)
app.use(notFoundHandler);
// Global error handler
app.use(errorHandler);
