import express from "express";
import helmet from "helmet";
import cors from "cors";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import { swaggerDocsHandler, swaggerUiHandler } from "./config/swagger.js";
import { userRoutes } from "./routes/user.routes.js";
import { institutionRoutes } from "./routes/authInstitution.routes.js";
import { institutionProfileRoutes } from "./routes/institution.routes.js";

export const app = express();

//  Security & Basic Middleware

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      // Allow requests without origin (like Postman, curl)
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Enable sending cookies or credentials
  optionsSuccessStatus: 200,
  exposedHeaders: ["Authorization"],
};

// Apply CORS middleware globally
app.use(cors(corsOptions));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:3000",
  "https://mutant-school.vercel.app",
];

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
//routes
app.use("/api/auth", authRoutes);
app.use("/api/user-profile", userRoutes);
app.use("/api/institution", institutionRoutes);
app.use("/api/institution-profile", institutionProfileRoutes);
app.use("/api-docs", swaggerUiHandler, swaggerDocsHandler);
// 🧯Global Error Handler
app.use(errorHandler);
