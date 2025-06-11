// utils/tokenUtils.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { RefreshToken } from "../models/refreshToken.model.js";

export const generateTokens = async (userOrInstitution) => {
  try {
    const payload = {
      userId: userOrInstitution._id,
      username: userOrInstitution.username,
      email: userOrInstitution.email,
      role:
        userOrInstitution.role || userOrInstitution.institutionType || "user",
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    const refreshTokenValue = crypto.randomBytes(40).toString("hex");

    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 1); // 1 day expiry

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
