import { uploadsToCloudinary } from "../config/cloudinary.js";
import { asyncErrorHandler } from "../middlewares/asyncHandler.js";
import { RefreshToken } from "../models/refreshToken.model.js";
import { User } from "../models/user.model.js";
import { generateTokens } from "../utils/generateTokens.js";
import { logger } from "../utils/logger.js";
import { sendResetEmail, sendVerificationEmail } from "../utils/sendMail.js";
import { validateLogin, validationRegistration } from "../utils/validation.js";
import validator from "validator";

// Create a new user
export const signUpUser = asyncErrorHandler(async (req, res) => {
  logger.info("Registration initiated...");

  // Validate input schema
  const { error } = validationRegistration(req.body);
  if (error) {
    logger.warn("Validation error:", error.details[0].message);
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const { email, name, username, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    logger.warn("User already exists:", email || username);
    return res.status(400).json({
      success: false,
      message: "User already exists",
    });
  }

  // Upload file to Cloudinary
  let url = "";
  let publicId = "";

  if (req.file) {
    try {
      const result = await uploadsToCloudinary(req.file.path);
      url = result.secure_url;
      publicId = result.public_id;
    } catch (err) {
      logger.error("Cloudinary upload error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Image upload failed. Please try again.",
      });
    }
  }

  // Generate verification token
  const verificationToken = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  const verificationExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

  // Create and save new user
  const user = new User({
    email,
    name,
    username,
    password,
    avatar: { url, publicId },
    verificationToken,
    verificationTokenExpiresAt: verificationExpires,
  });

  await user.save();
  logger.info(`User saved successfully: ${user._id}`);

  // Send verification email
  await sendVerificationEmail(email, verificationToken);

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens(user);

  return res.status(201).json({
    success: true,
    message: "User registered successfully",
    accessToken,
    refreshToken,
    data: user,
  });
});

// Verify user account
export const verifyAccount = asyncErrorHandler(async (req, res) => {
  if (!req.body) {
    return res.status(400).json({
      success: false,
      message: "Request body is missing",
    });
  }
  const { email, token } = req.body;

  // Find the user
  const user = await User.findOne({ email });
  if (!user) {
    logger.warn("Verification failed: User not found");
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Check if already verified
  if (user.isVerified) {
    logger.info("User already verified");
    return res.status(400).json({
      success: false,
      message: "Account already verified",
    });
  }

  // Check if token is valid and not expired
  const tokenExpired = user.verificationTokenExpiresAt < Date.now();
  if (user.verificationToken !== token || tokenExpired) {
    logger.warn("Invalid or expired verification token");
    return res.status(400).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  // Mark as verified
  user.isVerified = true;
  user.verificationToken = "";
  user.verificationTokenExpiresAt = null;
  await user.save();

  logger.info(`User verified successfully: ${user._id}`);

  return res.status(200).json({
    success: true,
    message: "Account verified successfully",
  });
});

// Login User
export const loginUser = asyncErrorHandler(async (req, res) => {
  logger.info("Login endpoint hit...");
  const { error } = validateLogin(req.body);
  if (error) {
    logger.warn("Validation error:", error.details[0].message);
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const isPassword = await user.comparePassword(password);
  if (!isPassword) {
    logger.warn("Invalid credentials");
    return res.status(400).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  return res.status(200).json({
    success: true,
    message: "User logged in successfully",
    accessToken,
    refreshToken,
    userId: user._id,
  });
});
// Refresh Token
export const userRefreshToken = asyncErrorHandler(async (req, res) => {
  logger.info("Refresh token endpoint hit...");
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.warn("Refresh token is missing");
    return res.status(400).json({
      success: false,
      message: "Refresh token is missing",
    });
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });

  if (!storedToken || storedToken.expiredAt < new Date()) {
    logger.warn("Invalid or expired token");
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  const user = await User.findById(storedToken.user);
  if (!user) {
    logger.warn("User not found for refresh token");
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const { accessToken: newAccess, refreshToken: newRefreshToken } =
    await generateTokens(user);

  // Delete the old token
  await RefreshToken.deleteOne({ _id: storedToken._id });

  return res.status(200).json({
    accessToken: newAccess,
    refreshToken: newRefreshToken,
  });
});
// Logout User
export const logOut = asyncErrorHandler(async (req, res) => {
  logger.info("Logout endpoint hit...");
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.warn("Refresh token is missing");
    return res.status(400).json({
      success: false,
      message: "Refresh token is missing",
    });
  }

  // 💡 FIX: Use the RefreshToken model here
  await RefreshToken.deleteOne({ token: refreshToken });

  logger.info("Refresh token deleted successfully");

  return res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
});

//request password token

export const resetPasswordToken = asyncErrorHandler(async (req, res) => {
  logger.info("reset token initiated...");
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({ message: "User does not exist" });
  }

  // Generate token and expiry
  const resetToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit token
  const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour from now

  // Save token and expiry to user
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpiresAt = resetTokenExpiresAt;

  await user.save();

  // Build frontend reset URL
  const resetLink = `${process.env.RESET_PASSWORD_URL}/reset-password/${resetToken}`;

  // Send the email
  await sendResetEmail(email, resetLink);

  res.status(200).json({ message: "Reset password link sent to your email" });
});

//Reset Password
export const resetPasword = asyncErrorHandler(async (req, res) => {
  logger.info("reset password initiated...");
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  const user = await User.findOne({ resetPasswordToken: resetToken });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  if (user.resetPasswordExpiresAt < Date.now()) {
    return res.status(400).json({ message: "Reset token has expired" });
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
    return res
      .status(400)
      .json({ message: "New password is not strong enough" });
  }

  // Set new password (hashing will be done by pre-save hook)
  user.password = newPassword;
  user.resetPasswordToken = "";
  user.resetPasswordExpiresAt = null;

  await user.save();

  return res.status(200).json({ message: "Password reset successfully" });
});
