import { logger } from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    logger?.error?.(err);
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  } else if (process.env.NODE_ENV === "production") {
    // Operational, trusted error
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      // Programming or unknown error
      logger?.error?.("UNEXPECTED ERROR:", err);
      res.status(500).json({
        status: "error",
        message: "Something went very wrong!",
      });
    }
  } else {
    // Fallback if NODE_ENV not set
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
};
