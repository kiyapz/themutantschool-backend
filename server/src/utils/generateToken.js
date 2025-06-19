import jwt from "jsonwebtoken";
import crypto from "crypto";
import { RefreshToken } from "../models/RefreshToken.model.js";
import { logger } from "./logger.js";

/**
 * Generate access & refresh tokens for User or Institution
 * @param {Object} entity - Mongoose document (User or Institution)
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export const generateTokens = async (entity) => {
  try {
    // 🏷️ Infer model type
    const model =
      entity?.firstName || entity?.lastName
        ? "User"
        : entity?.codename && entity?.name
        ? "Institution"
        : "Unknown";

    if (model === "Unknown") {
      logger.warn("⚠️ Unknown entity type when generating token", {
        entity,
      });
      throw new Error("Unrecognized entity type for token generation.");
    }

    const role = model === "Institution" ? "institution" : entity.role;

    const payload = {
      id: entity._id,
      email: entity.email,
      role,
      model,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "60m",
    });

    const refreshTokenValue = crypto.randomBytes(40).toString("hex");
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    await RefreshToken.create({
      token: refreshTokenValue,
      user: entity._id,
      userType: model,
      expiredAt,
    });

    logger.info("🔐 Token generated", {
      model,
      id: entity._id,
      email: entity.email,
      role,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  } catch (err) {
    logger.error("❌ Failed to generate tokens", {
      error: err.message,
      stack: err.stack,
    });
    throw new Error("Failed to generate tokens");
  }
};
