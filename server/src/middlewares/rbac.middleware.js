// middlewares/rbac.middleware.js
import { logger } from "../utils/logger.js";

/**
 * Role-based access control middleware
 * @param  {...string} allowedRoles - Roles allowed to access route (e.g. "admin", "institution", "instructor")
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.userRole; // role from verifyToken middleware
    const authUser = req.authUser;

    if (!userRole) {
      logger.warn(`Unauthorized access attempt - no role found. IP: ${req.ip}`);
      return res
        .status(403)
        .json({ message: "Access denied: No role assigned" });
    }

    if (!allowedRoles.includes(userRole)) {
      logger.warn(
        `Access denied for user ID: ${authUser?._id} | Role: ${userRole} | IP: ${req.ip}`
      );
      return res
        .status(403)
        .json({ message: "Access denied: Insufficient permissions" });
    }

    logger.info(
      `Access granted for user ID: ${authUser._id} | Role: ${userRole} | Path: ${req.originalUrl} | Method: ${req.method}`
    );

    next();
  };
};
