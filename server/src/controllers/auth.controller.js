// controllers/auth.controller.js
import { asyncHandler } from "../middlewares/ayncHandler.js";
import * as AuthService from "../services/auth.service.js";

export const registerUser = asyncHandler(async (req, res) => {
  const result = await AuthService.registerUser(req.body);
  return res.status(result.status).json(result);
});
export const loginUser = asyncHandler(async (req, res) => {
  const result = await AuthService.loginUser(req.body);

  if (!result.success) {
    return res.status(result.status).json(result);
  }

  // Set refresh token in HttpOnly cookie
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true in production
    sameSite: "Strict", // or "Lax"
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(result.status).json({
    success: result.success,
    status: result.status,
    message: result.message,
    accessToken: result.accessToken,
    userId: result.userId,
  });
});

export const verifyAccount = asyncHandler(async (req, res) => {
  const result = await AuthService.verifyAccount(req.body);
  return res.status(result.status).json(result);
});

export const resendVerification = asyncHandler(async (req, res) => {
  const result = await AuthService.resendVerification(req.body);
  return res.status(result.status).json(result);
});

export const checkUsername = asyncHandler(async (req, res) => {
  const result = await AuthService.checkUsername(req.body.username);
  return res.status(result.status).json(result);
});
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  const result = await AuthService.refreshToken(token);

  if (!result.success) {
    return res.status(result.status).json(result);
  }

  // Save the new refresh token in a cookie
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(result.status).json({
    success: true,
    accessToken: result.accessToken,
    message: "Token refreshed successfully",
  });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  await AuthService.logout(token);

  res.clearCookie("refreshToken");
  return res.status(200).json({ success: true, message: "User logged out" });
});

export const requestResetOTP = asyncHandler(async (req, res) => {
  const result = await AuthService.requestResetOTP(req.body.email);
  return res.status(result.status).json(result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.resetPassword(req.body);
  return res.status(result.status).json(result);
});
