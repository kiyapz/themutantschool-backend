import { Institution } from "../../../models/usersModels/institution.model.js";
import { InstitutionUser } from "../../../models/usersModels/InstitutionUser .js";
import { UserName } from "../../../models/usersModels/userName.model.js";
import { RefreshToken } from "../../../models/refreshToken.model.js";
import { validateLogin } from "../../../utils/validation.js";
import {
  generateOTP,
  tokenExpiry,
  handleValidationError,
  genericPasswordResetResponse,
} from "../../../utils/helpers/helpers.js";
import { generateTokens } from "../../../utils/generateTokens.js";
import {
  sendResetEmail,
  sendVerificationEmail,
} from "../../../utils/sendMail.js";

import { asyncErrorHandler } from "../../../middlewares/asyncHandler.js";
import { logger } from "../../../utils/logger.js";
import validator from "validator";

// ========== Register Institution User ==========
export const registerInstitutionUser = asyncErrorHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    userNameId,
    institutionId,
    role,
  } = req.body;

  logger.info(`Register attempt for email: ${email}`);

  const existing = await InstitutionUser.findOne({ email });
  if (existing) {
    logger.warn(`Registration failed: User with email ${email} already exists`);
    return res.status(409).json({
      success: false,
      message: "User with this email already exists",
    });
  }

  const username = await UserName.findById(userNameId);
  if (!username) {
    logger.warn(`Registration failed: Username ID ${userNameId} not found`);
    return res.status(404).json({
      success: false,
      message: "Username not found",
    });
  }

  const institution = await Institution.findById(institutionId);
  if (!institution) {
    logger.warn(
      `Registration failed: Institution ID ${institutionId} not found`
    );
    return res.status(404).json({
      success: false,
      message: "Institution not found",
    });
  }

  const verificationToken = generateOTP();
  const verificationTokenExpiresAt = tokenExpiry();

  const newUser = new InstitutionUser({
    firstName,
    lastName,
    email,
    password,
    username: userNameId,
    role,
    institution: institutionId,
    verificationToken,
    verificationTokenExpiresAt,
  });

  await newUser.save();
  logger.info(`User registered: ${email} (ID: ${newUser._id})`);

  await sendVerificationEmail(email, verificationToken);
  logger.info(`Verification email sent to ${email}`);

  const { accessToken, refreshToken } = await generateTokens(newUser);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    accessToken,
    refreshToken,
    data: newUser,
  });
});

// ========== Verify Account ==========
export const verifyInstitutionUser = asyncErrorHandler(async (req, res) => {
  const { email, token } = req.body;
  logger.info(`Verification attempt for email: ${email}`);

  const user = await InstitutionUser.findOne({ email });
  if (!user) {
    logger.warn(`Verification failed: User not found with email ${email}`);
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.isVerified) {
    logger.info(`Verification attempt on already verified account: ${email}`);
    return res
      .status(400)
      .json({ success: false, message: "Account already verified" });
  }

  if (
    user.verificationToken !== token ||
    user.verificationTokenExpiresAt < Date.now()
  ) {
    logger.warn(`Verification failed: Invalid or expired token for ${email}`);
    return res
      .status(400)
      .json({ success: false, message: "Invalid or expired token" });
  }

  user.isVerified = true;
  user.verificationToken = "";
  user.verificationTokenExpiresAt = null;
  await user.save();

  logger.info(`Account verified successfully for ${email}`);

  res
    .status(200)
    .json({ success: true, message: "Account verified successfully" });
});

// ========== Login ==========
export const loginInstitutionUser = asyncErrorHandler(async (req, res) => {
  const { error } = validateLogin(req.body);
  if (error) {
    logger.warn(`Login validation error: ${error.details[0].message}`);
    return handleValidationError(res, error);
  }

  const { email, password } = req.body;
  logger.info(`Login attempt for email: ${email}`);

  const user = await InstitutionUser.findOne({ email });
  if (!user) {
    logger.warn(`Login failed: User not found with email ${email}`);
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    logger.warn(`Login failed: Invalid credentials for ${email}`);
    return res
      .status(400)
      .json({ success: false, message: "Invalid credentials" });
  }

  if (!user.isVerified) {
    logger.warn(`Login failed: Account not verified for ${email}`);
    return res
      .status(400)
      .json({ success: false, message: "Please verify your account" });
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  logger.info(`Login successful for ${email}`);

  res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken,
    refreshToken,
    userId: user._id,
  });
});

// ========== Resend Verification ==========
export const resendInstitutionUserToken = asyncErrorHandler(
  async (req, res) => {
    const { email } = req.body;
    logger.info(`Resend verification token requested for email: ${email}`);

    const user = await InstitutionUser.findOne({ email });
    if (!user) {
      logger.warn(
        `Resend verification failed: User not found with email ${email}`
      );
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      logger.info(
        `Resend verification requested for already verified account: ${email}`
      );
      return res
        .status(400)
        .json({ success: false, message: "Account already verified" });
    }

    const token = generateOTP();
    user.verificationToken = token;
    user.verificationTokenExpiresAt = tokenExpiry();
    await user.save();

    await sendVerificationEmail(email, token);
    logger.info(`Verification token resent to ${email}`);

    res
      .status(200)
      .json({ success: true, message: "Verification token resent" });
  }
);

// ========== Request Password Reset ==========
export const requestInstitutionUserPasswordReset = asyncErrorHandler(
  async (req, res) => {
    const { email } = req.body;
    logger.info(`Password reset requested for email: ${email}`);

    const user = await InstitutionUser.findOne({ email });
    if (!user) {
      logger.warn(`Password reset requested for non-existent user: ${email}`);
      return genericPasswordResetResponse(res);
    }

    const otp = generateOTP();
    user.resetPasswordToken = otp;
    user.resetPasswordExpiresAt = tokenExpiry();
    await user.save({ validateBeforeSave: false });

    await sendResetEmail(email, otp);
    logger.info(`Password reset email sent to ${email}`);

    return genericPasswordResetResponse(res);
  }
);

// ========== Reset Password ==========
export const resetInstitutionUserPassword = asyncErrorHandler(
  async (req, res) => {
    const { email, otp, newPassword } = req.body;
    logger.info(`Password reset attempt for email: ${email}`);

    const user = await InstitutionUser.findOne({
      email,
      resetPasswordToken: otp,
    });

    if (!user || user.resetPasswordExpiresAt < Date.now()) {
      logger.warn(`Password reset failed: Invalid or expired OTP for ${email}`);
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (
      !validator.isStrongPassword(newPassword, {
        minLength: 6,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
    ) {
      logger.warn(`Password reset failed: Weak password provided for ${email}`);
      return res.status(400).json({ message: "Password is not strong enough" });
    }

    user.password = newPassword;
    user.resetPasswordToken = "";
    user.resetPasswordExpiresAt = null;
    await user.save();

    logger.info(`Password reset successful for ${email}`);

    res.status(200).json({ message: "Password reset successfully" });
  }
);

// ========== Logout ==========
export const logoutInstitutionUser = asyncErrorHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.warn(`Logout failed: Missing refresh token`);
    return res
      .status(400)
      .json({ success: false, message: "Refresh token is required" });
  }

  const token = await RefreshToken.findOne({ token: refreshToken });
  if (!token) {
    logger.warn(`Logout failed: Invalid or expired refresh token`);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }

  await RefreshToken.deleteOne({ token: refreshToken });

  logger.info(`Logout successful for token: ${refreshToken}`);

  res.status(200).json({ success: true, message: "Logged out successfully" });
});
