// utils/generateTokens.js

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { RefreshToken } from "../models/RefreshToken.model.js";
import { logger } from "./logger.js";

/**
 * Generate access & refresh tokens for a User or Institution
 * @param {Object} userOrInstitution - Mongoose document
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export const generateTokens = async (userOrInstitution) => {
  try {
    const isUser = userOrInstitution.role !== undefined;

    const payload = {
      id: userOrInstitution._id,
      email: userOrInstitution.email,
      role: isUser ? userOrInstitution.role : "institution",
      model: isUser ? "User" : "Institution",
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "60m",
    });

    const refreshTokenValue = crypto.randomBytes(40).toString("hex");
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    await RefreshToken.create({
      token: refreshTokenValue,
      user: userOrInstitution._id,
      userType: isUser ? "User" : "Institution",
      expiredAt,
    });

    // ✅ Info log with details
    logger.info(`🔐 Token generated`, {
      model: payload.model,
      id: payload.id,
      email: payload.email,
      role: payload.role,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  } catch (err) {
    // ❌ Error log
    logger.error("❌ Failed to generate tokens", {
      error: err.message,
      stack: err.stack,
    });
    throw new Error("Failed to generate tokens");
  }
};
