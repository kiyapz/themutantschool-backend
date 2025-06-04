import jwt from "jsonwebtoken";
import crypto from "crypto";
import { RefreshToken } from "../models/refreshToken.model.js";
import CustomError from "../middlewares/costumError.js";

export const generateTokens = async (user) => {
  try {
    const accessToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    const refreshTokenValue = crypto.randomBytes(40).toString("hex");

    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 1);

    await RefreshToken.create({
      token: refreshTokenValue,
      user: user._id,
      expiredAt,
    });

    return { accessToken, refreshToken: refreshTokenValue };
  } catch (err) {
    throw new CustomError("Failed to generate tokens", 500);
  }
};
