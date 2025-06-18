// controllers/institutionAuth.controller.js
import { asyncHandler } from "../middlewares/ayncHandler.js";
import * as AuthService from "../services/institutionAuth.service.js";

// Register Institution
export const registerInstitution = asyncHandler(async (req, res) => {
  const result = await AuthService.registerInstitution(req.body);
  return res.status(result.status).json(result);
});

// Login Institution
export const loginInstitution = asyncHandler(async (req, res) => {
  const result = await AuthService.loginInstitution(req.body);

  if (!result.success) {
    return res.status(result.status).json(result);
  }

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(result.status).json({
    success: result.success,
    status: result.status,
    message: result.message,
    accessToken: result.accessToken,
    institutionId: result.institutionId,
  });
});

// Verify Institution Account
export const verifyInstitutionAccount = asyncHandler(async (req, res) => {
  const result = await AuthService.verifyAccount(req.body);
  return res.status(result.status).json(result);
});

// Resend Verification Token
export const resendInstitutionVerification = asyncHandler(async (req, res) => {
  const result = await AuthService.resendVerification(req.body);
  return res.status(result.status).json(result);
});

// Check Codename Availability
export const checkCodename = asyncHandler(async (req, res) => {
  const result = await AuthService.checkCodename(req.body.codename);
  return res.status(result.status).json(result);
});

// Refresh Token
export const refreshInstitutionToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  const result = await AuthService.refreshToken(token);

  if (!result.success) {
    return res.status(result.status).json(result);
  }

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

// Logout
export const logoutInstitution = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  await AuthService.logout(token);

  res.clearCookie("refreshToken");
  return res
    .status(200)
    .json({ success: true, message: "Institution logged out" });
});

// Request Reset OTP
export const requestInstitutionResetOTP = asyncHandler(async (req, res) => {
  const result = await AuthService.requestResetOTP(req.body.email);
  return res.status(result.status).json(result);
});

// Reset Password
export const resetInstitutionPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.resetPassword(req.body);
  return res.status(result.status).json(result);
});
