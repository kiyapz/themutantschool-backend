import { logger } from "../utils/logger.js";
import { asyncErrorHandler } from "./asyncHandler.js";

export const checkRole = (role) =>
  asyncErrorHandler(async (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      logger.warn(
        `Unauthorized ${role}-only access attempt by user: ${
          req.user?.id || "Unknown"
        }`
      );
      return res.status(403).json({
        success: false,
        message: `Access denied. ${
          role[0].toUpperCase() + role.slice(1)
        }s only.`,
      });
    }
    next();
  });

export const isAdmin = checkRole("admin");
export const isInstructor = checkRole("instructor");
export const isAffiliate = checkRole("affiliate");
