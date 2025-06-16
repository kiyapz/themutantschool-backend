import { uploadsToCloudinary } from "../../config/cloudinary.js";
import { asyncErrorHandler } from "../../middlewares/asyncHandler.js";
import { RefreshToken } from "../../models/refreshToken.model.js";
import { User } from "../../models/usersModels/user.model.js";
import { UserName } from "../../models/usersModels/userName.model.js";
import { generateTokens } from "../../utils/generateTokens.js";
import {
  generateOTP,
  genericPasswordResetResponse,
  handleValidationError,
  tokenExpiry,
} from "../../utils/helpers/helpers.js";
import { logger } from "../../utils/logger.js";
import { sendResetEmail, sendVerificationEmail } from "../../utils/sendMail.js";
import {
  validateLogin,
  validationRegistration,
} from "../../utils/validation.js";
import validator from "validator";

//--------username registration-----------------
export const userName = asyncErrorHandler(async (req, res) => {
  const { username } = req.query;

  if (!username || username.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Username is required" });
  }

  const exists = await User.exists({ username });

  if (exists) {
    return res
      .status(409)
      .json({ success: false, message: "Username is already taken" });
  }

  return res
    .status(200)
    .json({ success: true, message: "Username is available" });
});
//-------- Registration -----------------
export const signUpUser = asyncErrorHandler(async (req, res) => {
  logger.info("Final registration step initiated...");

  const { error } = validationRegistration(req.body);
  if (error) return handleValidationError(res, error);

  const {
    email,
    firstName,
    lastName,
    password,
    role = "student",
    username,
  } = req.body;

  // Email check
  if (await User.exists({ email })) {
    logger.warn("User already exists with email:", email);
    return res
      .status(400)
      .json({ success: false, message: "Email already exists" });
  }

  // Username check
  if (await User.exists({ username })) {
    return res
      .status(400)
      .json({ success: false, message: "Username already taken" });
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
    data: user,
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
  if (user.isVerified === false) {
    logger.warn("please verify your account");
    return res.status(400).json({
      success: false,
      message: "Your account is not verified",
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

// -------- resend verification  Token --------
export const verifyAcountToken = asyncErrorHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    logger.warn("User does not exist");
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.isVerified) {
    return res.status(400).json({
      success: false,
      message: "Account is already verified",
    });
  }

  const newToken = generateOTP();
  const newExpiry = tokenExpiry();

  user.verificationToken = newToken;
  user.verificationTokenExpiresAt = newExpiry;
  await user.save();

  await sendVerificationEmail(email, newToken);
  logger.info(`Verification token resent to: ${email}`);

  return res.status(200).json({
    success: true,
    message: "Verification token resent",
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

//
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
