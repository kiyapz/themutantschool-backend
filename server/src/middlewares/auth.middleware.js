import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { Institution } from "../models/Institution.model.js";
import { logger } from "../utils/logger.js";
/**
 * Authenticate JWT token and attach user or institution to request
 */

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to find a user
    let user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
      return next();
    }

    // Try to find an institution
    let institution = await Institution.findById(decoded.id);
    if (institution) {
      institution.role = "institution"; // ✅ 👈 PATCH THIS
      req.institution = institution;
      return next();
    }

    return res.status(401).json({ message: "Unauthorized: User not found" });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
