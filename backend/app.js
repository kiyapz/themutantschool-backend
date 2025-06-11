import express from "express";
import helmet from "helmet";
import cors from "cors";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/apiErrors.js";
import { authRoutes } from "./routes/platform/auth.routes.js";
import { userRoutes } from "./routes/platform/user.route.js";
import { instituteRoutes } from "./routes/institution/auth.routes.js";

export const app = express();

//  Security & Basic Middleware
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

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/institution", instituteRoutes);
//  404 Handler
app.use(notFoundHandler);

// 🧯Global Error Handler
app.use(errorHandler);
