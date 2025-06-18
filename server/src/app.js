import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import {
  swaggerDocsHandler,
  swaggerUiHandler,
  swaggerSpec,
} from "./config/swagger.js";
import { authRoutes } from "./routes/auth.routes.js";
import { userRoutes } from "./routes/user.routes.js";
import { institutionRoutes } from "./routes/authInstitution.routes.js";
import { institutionProfileRoutes } from "./routes/institution.routes.js";

dotenv.config(); // Load .env variables

export const app = express();

// ✅ CORS setup
const allowedOrigins = [
  "http://localhost:3000",
  "https://mutant-school.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: ["Authorization"],
};

// ✅ Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// ✅ Logger
app.use((req, res, next) => {
  logger.info(`➡️ ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    logger.info(`📦 Body: ${JSON.stringify(req.body)}`);
  }
  next();
});

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/user-profile", userRoutes);
app.use("/api/institution", institutionRoutes);
app.use("/api/institution-profile", institutionProfileRoutes);

// ✅ Swagger JSON (always exposed)
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ✅ Swagger UI (conditionally exposed)
if (
  process.env.NODE_ENV === "development" ||
  process.env.ENABLE_API_DOCS_UI === "true"
) {
  app.use("/api-docs", swaggerUiHandler, swaggerDocsHandler);
}

// ✅ Global error handler
app.use(errorHandler);
