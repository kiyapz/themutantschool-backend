import { uploadsToCloudinary } from "../config/cloudinary.js";
import { asyncErrorHandler } from "../middlewares/asyncHandler.js";
import { RefreshToken } from "../models/refreshToken.model.js";
import { User } from "../models/user.model.js";
import { UserName } from "../models/userName.model.js";
import { generateTokens } from "../utils/generateTokens.js";
import { logger } from "../utils/logger.js";
import { sendResetEmail, sendVerificationEmail } from "../utils/sendMail.js";
import { validateLogin, validationRegistration } from "../utils/validation.js";
import validator from "validator";

// Helper to generate 6-digit OTP token
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Helper for token expiry time (1 hour from now)
const tokenExpiry = () => Date.now() + 60 * 60 * 1000;

// Centralized error response for validation errors
const handleValidationError = (res, error) =>
  res.status(400).json({ success: false, message: error.details[0].message });

// Centralized generic response for password reset request
const genericPasswordResetResponse = (res) =>
  res
    .status(200)
    .json({ message: "If the email exists, an OTP has been sent." });

//--------username registration-----------------
export const userName = asyncErrorHandler(async (req, res) => {
  logger.info("username initiated...");
  const { username } = req.body;

  const userExist = await UserName.findOne({ username });
  if (userExist) {
    return res
      .status(400)
      .json({ success: false, message: "User already exists" });
  }

  const newUsername = new UserName({ username });
  await newUsername.save();

  return res.status(201).json({
    success: true,
    message: "User name created successfully",
    newUsername,
    userNameId: newUsername._id,
  });
});

export const signUpUser = asyncErrorHandler(async (req, res) => {
  logger.info("Registration initiated...");

  const { error } = validationRegistration(req.body);
  if (error) return handleValidationError(res, error);

  const {
    email,
    firstName,
    lastName,
    username,
    password,
    role = "student",
  } = req.body;

  if (await User.exists({ $or: [{ email }, { username }] })) {
    logger.warn("User already exists:", email || username);
    return res
      .status(400)
      .json({ success: false, message: "User already exists" });
  }

  // Get username document
  const usernameExist = await UserName.findOne({ username });
  if (!usernameExist) {
    return res.status(404).json({
      success: false,
      message: "User name not found",
    });
  }

  let avatar = { url: "", publicId: "" };
  if (req.file) {
    try {
      const result = await uploadsToCloudinary(req.file.path);
      avatar = { url: result.secure_url, publicId: result.public_id };
    } catch (err) {
      logger.error("Cloudinary upload error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Image upload failed. Please try again.",
      });
    }
  }

  const verificationToken = generateOTP();
  const verificationTokenExpiresAt = tokenExpiry();

  const user = new User({
    email,
    firstName,
    lastName,
    username: usernameExist._id,
    password,
    avatar,
    verificationToken,
    verificationTokenExpiresAt,
    role,
  });

  await user.save();
  logger.info(`User saved successfully: ${user._id}`);

  await sendVerificationEmail(email, verificationToken);

  const { accessToken, refreshToken } = await generateTokens(user);

  return res.status(201).json({
    success: true,
    message: "User registered successfully",
    accessToken,
    refreshToken,
    data: user, // consider sanitizing here before sending
  });
});

// -------- Verify Account --------
export const verifyAccount = asyncErrorHandler(async (req, res) => {
  const { email, token } = req.body || {};
  if (!email || !token) {
    return res
      .status(400)
      .json({ success: false, message: "Email and token are required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    logger.warn("Verification failed: User not found");
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.isVerified) {
    logger.info("User already verified");
    return res
      .status(400)
      .json({ success: false, message: "Account already verified" });
  }

  if (
    user.verificationToken !== token ||
    user.verificationTokenExpiresAt < Date.now()
  ) {
    logger.warn("Invalid or expired verification token");
    return res
      .status(400)
      .json({ success: false, message: "Invalid or expired token" });
  }

  user.isVerified = true;
  user.verificationToken = "";
  user.verificationTokenExpiresAt = null;
  await user.save();

  logger.info(`User verified successfully: ${user._id}`);

  return res
    .status(200)
    .json({ success: true, message: "Account verified successfully" });
});

// -------- Login User --------
export const loginUser = asyncErrorHandler(async (req, res) => {
  logger.info("Login endpoint hit...");

  const { error } = validateLogin(req.body);
  if (error) return handleValidationError(res, error);

  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    logger.warn("Invalid credentials");
    return res
      .status(400)
      .json({ success: false, message: "Invalid credentials" });
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

// -------- Refresh Token --------
export const userRefreshToken = asyncErrorHandler(async (req, res) => {
  logger.info("Refresh token endpoint hit...");

  const { refreshToken } = req.body;
  if (!refreshToken) {
    logger.warn("Refresh token is missing");
    return res
      .status(400)
      .json({ success: false, message: "Refresh token is missing" });
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!storedToken || storedToken.expiredAt < new Date()) {
    logger.warn("Invalid or expired token");
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }

  const user = await User.findById(storedToken.user);
  if (!user) {
    logger.warn("User not found for refresh token");
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
    user
  );

  await RefreshToken.deleteOne({ _id: storedToken._id });

  return res.status(200).json({ accessToken, refreshToken: newRefreshToken });
});

// -------- Logout User --------
export const logOut = asyncErrorHandler(async (req, res) => {
  logger.info("Logout endpoint hit...");

  const { refreshToken } = req.body;
  if (!refreshToken) {
    logger.warn("Refresh token is missing");
    return res
      .status(400)
      .json({ success: false, message: "Refresh token is missing" });
  }

  await RefreshToken.deleteOne({ token: refreshToken });

  logger.info("Refresh token deleted successfully");

  return res
    .status(200)
    .json({ success: true, message: "User logged out successfully" });
});

// -------- Request Password Reset OTP --------
export const requestPasswordResetOTP = asyncErrorHandler(async (req, res) => {
  logger.info("Password reset OTP requested...");

  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return genericPasswordResetResponse(res);

  const resetOTP = generateOTP();
  const resetPasswordExpiresAt = tokenExpiry();

  // Option 1: save with validation skipped
  user.resetPasswordToken = resetOTP;
  user.resetPasswordExpiresAt = resetPasswordExpiresAt;
  await user.save({ validateBeforeSave: false });

  // Option 2: updateOne
  // await User.updateOne({ _id: user._id }, {
  //   resetPasswordToken: resetOTP,
  //   resetPasswordExpiresAt: resetPasswordExpiresAt,
  // });

  await sendResetEmail(email, resetOTP);

  return genericPasswordResetResponse(res);
});

// -------- Reset Password --------
export const resetPassword = asyncErrorHandler(async (req, res) => {
  logger.info("Password reset with OTP initiated...");

  const { email, otp, newPassword } = req.body;

  logger.info(`Reset attempt for email: ${email} with OTP: ${otp}`);

  const user = await User.findOne({ email, resetPasswordToken: otp });
  if (!user) {
    logger.warn(`Invalid OTP or email: OTP received ${otp}`);
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  logger.info(`User found, OTP expires at: ${user.resetPasswordExpiresAt}`);

  if (user.resetPasswordExpiresAt < Date.now()) {
    logger.warn("OTP expired");
    return res.status(400).json({ message: "OTP has expired" });
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

  user.password = newPassword;
  user.resetPasswordToken = "";
  user.resetPasswordExpiresAt = null;
  await user.save();

  return res.status(200).json({ message: "Password reset successfully" });
});
