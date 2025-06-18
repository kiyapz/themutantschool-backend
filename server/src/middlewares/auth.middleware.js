import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { Institution } from "../models/Institution.model.js";
import { logger } from "../utils/logger.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded payload keys: id, email, role, model

    let authUser = null;
    let source = "";

    if (
      decoded.role === "admin" ||
      decoded.role === "student" ||
      decoded.role === "instructor" ||
      decoded.role === "affiliate"
    ) {
      authUser = await User.findById(decoded.id).select("-password");
      source = "user";
    } else if (
      decoded.role === "institution" ||
      decoded.model === "Institution"
    ) {
      authUser = await Institution.findById(decoded.id).select("-password");
      source = "institution";
    } else {
      // Unknown role, reject access
      return res.status(401).json({ message: "Invalid token role" });
    }

    if (!authUser) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    // Attach useful info to request for downstream middleware/controllers
    req.authUser = authUser;
    req.authSource = source;
    req.userRole = authUser.role;

    logger.info(
      `🔑 Authenticated [${source}] | ID: ${authUser._id} | Role: ${authUser.role} | Email: ${authUser.email}`
    );

    next();
  } catch (err) {
    logger.error("Token verification failed:", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
