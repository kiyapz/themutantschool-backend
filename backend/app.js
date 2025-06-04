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
import { authRoutes } from "./routes/auth.routes.js";

export const app = express();

// 🚀 Redis Setup
const redisClient = new Redis(process.env.REDIS_URL);
redisClient.on("error", (err) => logger.error("❌ Redis error:", err));
redisClient.on("connect", () => logger.info("✅ Connected to Redis"));

// 🛡️ Security & Basic Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// 📋 Request Logging
app.use((req, res, next) => {
  logger.info(`➡️ ${req.method} ${req.url}`);
  if (
    req.body &&
    typeof req.body === "object" &&
    Object.keys(req.body).length > 0
  ) {
    logger.info(`📦 Body: ${JSON.stringify(req.body)}`);
  }
  next();
});

// 🚦 Global Rate Limiter Middleware
const globalRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl_global",
  points: 5, // requests
  duration: 1, // per second
});

const rateLimitMiddleware = (req, res, next) => {
  globalRateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`🚫 Rate limit exceeded: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    });
};

app.use(rateLimitMiddleware);

// 🔐 Sensitive Endpoint Rate Limiter
const sensitiveEndpointLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RateLimitRedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  handler: (req, res) => {
    logger.warn(`🚫 Sensitive endpoint limit exceeded: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests. Please wait and try again.",
    });
  },
});

// 🛣️ Routes
app.use("/api/auth/register", sensitiveEndpointLimiter);
app.use("/api/auth", authRoutes);

// ❓ 404 Handler
app.use(notFoundHandler);

// 🧯 Global Error Handler
app.use(errorHandler);
