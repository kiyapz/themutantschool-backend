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
import { authRoutes } from "./routes/platform/auth.routes.js";
import { userRoutes } from "./routes/platform/user.route.js";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

export const app = express();

// 🚀 Redis Setup
// const redisClient = new Redis(process.env.REDIS_URL);
// redisClient.on("error", (err) => logger.error("❌ Redis error:", err));
// redisClient.on("connect", () => logger.info("✅ Connected to Redis"));

// 🛡️ Security & Basic Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
// Allowed front-end URL(s)
const allowedOrigins = [process.env.FRONTEND_URL];

// CORS options object
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      // Allow requests with no origin (like Postman, curl)
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      // Origin allowed
      callback(null, true);
    } else {
      // Origin not allowed
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // if you need to support cookies/auth
  optionsSuccessStatus: 200, // For legacy browser support
};

// Apply CORS middleware globally
app.use(cors(corsOptions));
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
// const globalRateLimiter = new RateLimiterRedis({
//   storeClient: redisClient,
//   keyPrefix: "rl_global",
//   points: 5, // requests
//   duration: 1, // per second
// });

// const rateLimitMiddleware = (req, res, next) => {
//   globalRateLimiter
//     .consume(req.ip)
//     .then(() => next())
//     .catch(() => {
//       logger.warn(`🚫 Rate limit exceeded: ${req.ip}`);
//       res.status(429).json({
//         success: false,
//         message: "Too many requests. Please try again later.",
//       });
//     });
// };

// app.use(rateLimitMiddleware);

//  🔐 Sensitive Endpoint Rate Limiter
// const sensitiveEndpointLimiter = rateLimit({
//   windowMs: 10 * 60 * 1000, // 10 minutes
//   max: 10,
//   standardHeaders: true,
//   legacyHeaders: false,
//   store: new RateLimitRedisStore({
//     sendCommand: (...args) => redisClient.call(...args),
//   }),
//   handler: (req, res) => {
//     logger.warn(`🚫 Sensitive endpoint limit exceeded: ${req.ip}`);
//     res.status(429).json({
//       success: false,
//       message: "Too many requests. Please wait and try again.",
//     });
//   },
// });

// Swagger config
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MUTANT SCHOOL",
      version: "1.0.0",
      description: "API documentation for Mutant School",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["./routes/*.js"], // <-- Point to your routes for JSDoc scanning
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Serve Swagger UI at /api-docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 🛣️ Routes
// app.use("/api/auth/register", sensitiveEndpointLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// ❓ 404 Handler
app.use(notFoundHandler);

// 🧯 Global Error Handler
app.use(errorHandler);
