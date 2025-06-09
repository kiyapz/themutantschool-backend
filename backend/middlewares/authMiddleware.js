import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";
import { asyncErrorHandler } from "./asyncHandler.js";

export const authMiddleware = asyncErrorHandler(async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Access denied. No token provided.");
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn(`Token verification failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
});
