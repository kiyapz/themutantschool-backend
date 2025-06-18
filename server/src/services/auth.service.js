// services/auth.service.js
import { User } from "../models/User.model.js";
import { generateOTP } from "../utils/generateOtp.js";
import { tokenExpiry } from "../utils/tokenExpiry.js";
import {
  validateLogin,
  validationRegistration,
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

// Register User
export const registerUser = async (body) => {
  logger.info("Attempting to register user");

  const { error } = validationRegistration(body);
  if (error) {
    logger.warn(`Validation failed: ${error.details[0].message}`);
    return { status: 400, success: false, message: error.details[0].message };
  }

  const {
    email,
    firstName,
    lastName,
    password,
    username,
    role = "student",
  } = body;

  if (await User.exists({ email })) {
    logger.warn(`Registration failed: Email already exists - ${email}`);
    return { status: 400, success: false, message: "Email already exists" };
  }

  if (await User.exists({ username })) {
    logger.warn(`Registration failed: Username taken - ${username}`);
    return { status: 400, success: false, message: "Username already taken" };
  }

  const verificationToken = generateOTP();
  const verificationTokenExpiresAt = tokenExpiry();
  const user = new User({
    email,
    firstName,
    lastName,
    password,
    username,
    verificationToken,
    verificationTokenExpiresAt,
    role,
    profile: {
      avatar: {
        url: "",
        publicId: "",
      },
      bio: "",
      socialLinks: {
        website: "",
        twitter: "",
        linkedin: "",
      },
    },
  });

  await user.save();
  await sendVerificationEmail(email, verificationToken);

  const { accessToken, refreshToken } = await generateTokens(user);

  logger.info(`User registered: ${email}`);
  return {
    status: 201,
    success: true,
    message: "User registered successfully",
    accessToken,
    refreshToken,
    data: user.toPublic(),
  };
};

// Login User
export const loginUser = async (body) => {
  logger.info("Attempting user login");

  const { error } = validateLogin(body);
  if (error) {
    logger.warn(`Login validation failed: ${error.details[0].message}`);
    return { status: 400, success: false, message: error.details[0].message };
  }

  const { email, password } = body;
  const user = await User.findOne({ email });
  if (!user) {
    logger.warn(`Login failed: User not found - ${email}`);
    return { status: 404, success: false, message: "User not found" };
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    logger.warn(`Login failed: Invalid credentials - ${email}`);
    return { status: 400, success: false, message: "Invalid credentials" };
  }

  if (!user.isVerified) {
    logger.warn(`Login failed: Account not verified - ${email}`);
    return { status: 400, success: false, message: "Account not verified" };
  }

  const { accessToken, refreshToken } = await generateTokens(user);
  logger.info(`Login successful: ${email}`);
  return {
    status: 200,
    success: true,
    message: "Login successful",
    accessToken,
    refreshToken,

    data: user.toPublic(),
  };
};

// ✅ Verify Account with descriptive error messages
export const verifyAccount = async ({ email, token }) => {
  logger.info(`Verifying account for ${email}`);
  const user = await User.findOne({ email });

  if (!user) {
    return {
      status: 404,
      success: false,
      message: "User not found. Please check the email address.",
    };
  }

  if (user.isVerified) {
    return {
      status: 400,
      success: false,
      message: "This account is already verified. You can log in.",
    };
  }

  const tokenExpired = user.verificationTokenExpiresAt < Date.now();
  const tokenMismatch = user.verificationToken !== token;

  if (tokenMismatch) {
    logger.warn(`Verification failed: invalid token for ${email}`);
    return {
      status: 400,
      success: false,
      message:
        "The verification token is invalid. Please double-check the token sent to your email.",
    };
  }

  if (tokenExpired) {
    logger.warn(`Verification failed: expired token for ${email}`);
    return {
      status: 400,
      success: false,
      message:
        "The verification token has expired. Please request a new verification email.",
    };
  }

  user.isVerified = true;
  user.verificationToken = "";
  user.verificationTokenExpiresAt = null;
  await user.save();

  logger.info(`Account verified for ${email}`);
  return {
    status: 200,
    success: true,
    message: "Your account has been successfully verified.",
  };
};

// Resend Verification
export const resendVerification = async ({ email }) => {
  logger.info(`Resending verification to ${email}`);
  const user = await User.findOne({ email });

  if (!user) return { status: 404, success: false, message: "User not found" };
  if (user.isVerified)
    return { status: 400, success: false, message: "Already verified" };

  user.verificationToken = generateOTP();
  user.verificationTokenExpiresAt = tokenExpiry();
  await user.save();

  await sendVerificationEmail(email, user.verificationToken);
  return { status: 200, success: true, message: "Token resent" };
};

// Check Username
export const checkUsername = async (username) => {
  if (!username || username.trim() === "") {
    logger.warn("Username check failed: Username is empty");
    return { status: 400, success: false, message: "Username is required" };
  }

  const exists = await User.exists({ username });
  if (exists) {
    logger.warn(`Username already taken: ${username}`);
    return {
      status: 409,
      success: false,
      message: "Username is already taken",
    };
  }

  logger.info(`Username available: ${username}`);
  return { status: 200, success: true, message: "Username is available" };
};

// Refresh Token
export const refreshToken = async (token) => {
  const stored = await RefreshToken.findOne({ token });
  if (!stored || stored.expiredAt < new Date()) {
    return { status: 401, success: false, message: "Invalid or expired token" };
  }

  const user = await User.findById(stored.user);
  if (!user) {
    return { status: 404, success: false, message: "User not found" };
  }

  // Delete old token
  await RefreshToken.deleteOne({ _id: stored._id });

  // Generate new tokens
  const { accessToken, refreshToken } = await generateTokens(user); // This should save new refresh token to DB

  return {
    status: 200,
    success: true,
    accessToken,
    refreshToken, // Send it back to controller to store in cookie
  };
};

export const logout = async (token) => {
  await RefreshToken.deleteOne({ token });
  logger.info("User logged out");
  return { status: 200, success: true, message: "User logged out" };
};
// Logout

// Request Reset OTP
export const requestResetOTP = async (email) => {
  logger.info(`Password reset request for ${email}`);
  const user = await User.findOne({ email });

  if (!user) return genericPasswordResetResponse();

  user.resetPasswordToken = generateOTP();
  user.resetPasswordExpiresAt = tokenExpiry();
  await user.save({ validateBeforeSave: false });

  await sendResetEmail(email, user.resetPasswordToken);
  logger.info(`Reset OTP sent to ${email}`);
  return genericPasswordResetResponse();
};
// Reset Password
export const resetPassword = async ({ email, otp, newPassword }) => {
  logger.info(`Resetting password for ${email}`);
  const user = await User.findOne({ email });

  if (!user) {
    return {
      status: 404,
      success: false,
      message: "User not found. Please check the email address.",
    };
  }

  const tokenMismatch = user.resetPasswordToken !== otp;
  const tokenExpired = user.resetPasswordExpiresAt < Date.now();

  if (tokenMismatch) {
    logger.warn(`Password reset failed: invalid OTP for ${email}`);
    return {
      status: 400,
      success: false,
      message:
        "The reset token you entered is invalid. Please ensure you copied it correctly from the email.",
    };
  }

  if (tokenExpired) {
    logger.warn(`Password reset failed: expired OTP for ${email}`);
    return {
      status: 400,
      success: false,
      message:
        "The reset token has expired. Please request a new password reset to receive a fresh token.",
    };
  }

  const isStrong = validator.isStrongPassword(newPassword, {
    minLength: 6,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  });

  if (!isStrong) {
    logger.warn("Weak password provided during reset");
    return {
      status: 400,
      success: false,
      message:
        "Your new password is too weak. Please include at least one uppercase letter, one number, and one special character.",
    };
  }

  user.password = newPassword;
  user.resetPasswordToken = "";
  user.resetPasswordExpiresAt = null;
  await user.save();

  logger.info(`Password reset successfully for ${email}`);
  return {
    status: 200,
    success: true,
    message: "Your password has been reset successfully. You can now log in.",
  };
};
