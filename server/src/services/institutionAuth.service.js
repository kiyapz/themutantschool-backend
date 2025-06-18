// services/auth.service.js
import { Institution } from "../models/Institution.model.js";
import { generateOTP } from "../utils/generateOtp.js";
import { tokenExpiry } from "../utils/tokenExpiry.js";
import {
  validateLogin,
  validationInstitutionRegistration,
} from "../validations/auth.validation.js";
import {
  sendVerificationEmail,
  sendResetEmail,
} from "../utils/Emails/sendMails.js";
import validator from "validator";
import { genericPasswordResetResponse } from "../utils/otpResponse.js";
import { RefreshToken } from "../models/RefreshToken.model.js";
import { generateTokens } from "../utils/generateToken.js";
import { logger } from "../utils/logger.js";

// Register Institution
export const registerInstitution = async (body) => {
  logger.info("Attempting to register institution");

  const { error } = validationInstitutionRegistration(body);
  if (error) {
    logger.warn(`Validation failed: ${error.details[0].message}`);
    return { status: 400, success: false, message: error.details[0].message };
  }

  const {
    email,
    firstName,
    lastName,
    password,
    codename,
    role = "admin",
  } = body;

  if (await Institution.exists({ email })) {
    logger.warn(`Registration failed: Email already exists - ${email}`);
    return { status: 400, success: false, message: "Email already exists" };
  }

  if (await Institution.exists({ codename })) {
    logger.warn(`Registration failed: Codename taken - ${codename}`);
    return { status: 400, success: false, message: "Codename already taken" };
  }

  const verificationToken = generateOTP();
  const verificationTokenExpiresAt = tokenExpiry();

  const institution = new Institution({
    email,
    firstName,
    lastName,
    password,
    codename,
    verificationToken,
    verificationTokenExpiresAt,
    role,
  });

  await institution.save();
  await sendVerificationEmail(email, verificationToken);

  const { accessToken, refreshToken } = await generateTokens(institution);

  logger.info(`Institution registered: ${email}`);
  return {
    status: 201,
    success: true,
    message: "Institution registered successfully",
    accessToken,
    refreshToken,
    data: institution,
  };
};

// Login Institution
export const loginInstitution = async (body) => {
  logger.info("Attempting institution login");

  const { error } = validateLogin(body);
  if (error) {
    logger.warn(`Login validation failed: ${error.details[0].message}`);
    return { status: 400, success: false, message: error.details[0].message };
  }

  const { email, password } = body;
  const institution = await Institution.findOne({ email });
  if (!institution) {
    logger.warn(`Login failed: Institution not found - ${email}`);
    return { status: 404, success: false, message: "Institution not found" };
  }

  const isMatch = await institution.comparePassword(password);
  if (!isMatch) {
    logger.warn(`Login failed: Invalid credentials - ${email}`);
    return { status: 400, success: false, message: "Invalid credentials" };
  }

  if (!institution.isVerified) {
    logger.warn(`Login failed: Account not verified - ${email}`);
    return { status: 400, success: false, message: "Account not verified" };
  }

  const { accessToken, refreshToken } = await generateTokens(institution);
  logger.info(`Login successful: ${email}`);
  return {
    status: 200,
    success: true,
    message: "Login successful",
    accessToken,
    refreshToken,
    institutionId: institution._id,
  };
};

// Verify Account
export const verifyAccount = async ({ email, token }) => {
  logger.info(`Verifying account for ${email}`);
  const institution = await Institution.findOne({ email });

  if (!institution)
    return { status: 404, success: false, message: "Institution not found" };
  if (institution.isVerified)
    return { status: 400, success: false, message: "Already verified" };

  if (
    institution.verificationToken !== token ||
    institution.verificationTokenExpiresAt < Date.now()
  ) {
    logger.warn(`Verification failed for ${email}`);
    return { status: 400, success: false, message: "Invalid or expired token" };
  }

  institution.isVerified = true;
  institution.verificationToken = "";
  institution.verificationTokenExpiresAt = null;
  await institution.save();

  logger.info(`Account verified for ${email}`);
  return { status: 200, success: true, message: "Account verified" };
};

// Resend Verification
export const resendVerification = async ({ email }) => {
  logger.info(`Resending verification to ${email}`);
  const institution = await Institution.findOne({ email });

  if (!institution)
    return { status: 404, success: false, message: "Institution not found" };
  if (institution.isVerified)
    return { status: 400, success: false, message: "Already verified" };

  institution.verificationToken = generateOTP();
  institution.verificationTokenExpiresAt = tokenExpiry();
  await institution.save();

  await sendVerificationEmail(email, institution.verificationToken);
  return { status: 200, success: true, message: "Token resent" };
};

// Check Codename
export const checkCodename = async (codename) => {
  if (!codename || codename.trim() === "") {
    logger.warn("Codename check failed: Codename is empty");
    return { status: 400, success: false, message: "Codename is required" };
  }

  const exists = await Institution.exists({ codename });
  if (exists) {
    logger.warn(`Codename already taken: ${codename}`);
    return {
      status: 409,
      success: false,
      message: "Codename is already taken",
    };
  }

  logger.info(`Codename available: ${codename}`);
  return { status: 200, success: true, message: "Codename is available" };
};

// Refresh Token
export const refreshToken = async (token) => {
  const stored = await RefreshToken.findOne({ token });
  if (!stored || stored.expiredAt < new Date()) {
    return { status: 401, success: false, message: "Invalid or expired token" };
  }

  const institution = await Institution.findById(stored.user);
  if (!institution) {
    return { status: 404, success: false, message: "Institution not found" };
  }

  await RefreshToken.deleteOne({ _id: stored._id });

  const { accessToken, refreshToken } = await generateTokens(institution);

  return {
    status: 200,
    success: true,
    accessToken,
    refreshToken,
  };
};

// Logout
export const logout = async (token) => {
  await RefreshToken.deleteOne({ token });
  logger.info("Institution logged out");
  return { status: 200, success: true, message: "Institution logged out" };
};

// Request Reset OTP
export const requestResetOTP = async (email) => {
  logger.info(`Password reset request for ${email}`);
  const institution = await Institution.findOne({ email });

  if (!institution) return genericPasswordResetResponse();

  institution.resetPasswordToken = generateOTP();
  institution.resetPasswordExpiresAt = tokenExpiry();
  await institution.save({ validateBeforeSave: false });

  await sendResetEmail(email, institution.resetPasswordToken);
  logger.info(`Reset OTP sent to ${email}`);
  return genericPasswordResetResponse();
};

// Reset Password
export const resetPassword = async ({ email, otp, newPassword }) => {
  logger.info(`Resetting password for ${email}`);
  const institution = await Institution.findOne({
    email,
    resetPasswordToken: otp,
  });

  if (!institution || institution.resetPasswordExpiresAt < Date.now()) {
    logger.warn(`Password reset failed: Invalid or expired OTP for ${email}`);
    return { status: 400, success: false, message: "Invalid or expired OTP" };
  }

  const valid = validator.isStrongPassword(newPassword, {
    minLength: 6,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  });

  if (!valid) {
    logger.warn("Weak password provided during reset");
    return { status: 400, success: false, message: "Weak password" };
  }

  institution.password = newPassword;
  institution.resetPasswordToken = "";
  institution.resetPasswordExpiresAt = null;
  await institution.save();

  logger.info(`Password reset successfully for ${email}`);
  return { status: 200, success: true, message: "Password reset successfully" };
};
