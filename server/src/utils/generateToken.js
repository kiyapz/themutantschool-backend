import jwt from "jsonwebtoken";
import crypto from "crypto";
import { RefreshToken } from "../models/refreshToken.model.js";

export const generateTokens = async (userOrInstitution) => {
  try {
    const payload = {
      userId: userOrInstitution._id,
      email: userOrInstitution.email,
      role:
        userOrInstitution.role || userOrInstitution.institutionType || "user",
      model: userOrInstitution.role ? "user" : "institution",
    };

    // Log who the access token is being generated for
    console.log(
      `🔐 Generating access token for: model=${payload.model}, id=${payload.userId}, email=${payload.email}, role=${payload.role}`
    );

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "60m",
    });

    const refreshTokenValue = crypto.randomBytes(40).toString("hex");
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    await RefreshToken.create({
      token: refreshTokenValue,
      user: userOrInstitution._id,
      userType: userOrInstitution.role ? "User" : "Institution",
      expiredAt,
    });

    return { accessToken, refreshToken: refreshTokenValue };
  } catch (err) {
    throw new Error("Failed to generate tokens");
  }
};
