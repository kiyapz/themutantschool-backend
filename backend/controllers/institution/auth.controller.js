import { logger } from "../../utils/logger.js";
import { asyncErrorHandler } from "../../middlewares/asyncHandler.js";
import { Institution } from "../../models/usersModels/institution.model.js";
import { UserName } from "../../models/usersModels/userName.model.js";
import {
  validationInstitutionRegistration,
  validateLogin,
} from "../../utils/validation.js";
import {
  generateOTP,
  tokenExpiry,
  handleValidationError,
  genericPasswordResetResponse,
} from "../../utils/helpers/helpers.js";
import { generateTokens } from "../../utils/generateTokens.js";
import { sendVerificationEmail, sendResetEmail } from "../../utils/sendMail.js";
import validator from "validator";
import { RefreshToken } from "../../models/refreshToken.model.js";

export const registerInstitution = asyncErrorHandler(async (req, res) => {
  logger.info("Institution registration initiated...");

  // Validate request body
  const { error } = validationInstitutionRegistration(req.body);
  if (error) return handleValidationError(res, error);

  const {
    name,
    email,
    password,
    institutionType = "other",
    userNameId,
  } = req.body;

  //check req
  if (!req.body) {
    return res.status(400).json({
      success: false,
      message: "Missing request body. Ensure Content-Type is application/json",
    });
  }

  // Check for duplicate institution email
  const institutionExist = await Institution.findOne({ email });
  if (institutionExist) {
    logger.warn(`Institution already exists: ${email}`);
    return res.status(409).json({
      success: false,
      message: "Institution with this email already exists.",
    });
  }

  // Validate username existence
  const usernameDoc = await UserName.findById(userNameId);
  if (!usernameDoc) {
    return res.status(404).json({
      success: false,
      message: "Username not found. Please register a username first.",
    });
  }

  // Generate verification token
  const verificationToken = generateOTP();
  const verificationTokenExpiresAt = tokenExpiry();

  // Create new institution
  const newInstitution = new Institution({
    name,
    email,
    password,
    username: usernameDoc._id,
    institutionType,
    verificationToken,
    verificationTokenExpiresAt,
  });

  await newInstitution.save();
  logger.info(`Institution created: ${newInstitution._id}`);

  // Send verification email
  await sendVerificationEmail(email, verificationToken);

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens(newInstitution);

  return res.status(201).json({
    success: true,
    message: "Institution registered successfully",
    accessToken,
    refreshToken,
    data: newInstitution,
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

  const user = await Institution.findOne({ email });
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
  const user = await Institution.findOne({ email });
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
export const resendVerifyAcountToken = asyncErrorHandler(async (req, res) => {
  const { email } = req.body;

  const user = await Institution.findOne({ email });
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
// export const instituteRefreshToken = asyncErrorHandler(async (req, res) => {
//   logger.info("Refresh token endpoint hit...");

//   const { refreshToken } = req.body;
//   if (!refreshToken) {
//     logger.warn("Refresh token is missing");
//     return res
//       .status(400)
//       .json({ success: false, message: "Refresh token is required" });
//   }

//   // Check if the token exists and is not expired
//   const storedToken = await RefreshToken.findOne({ token: refreshToken });
//   if (!storedToken) {
//     logger.warn("Invalid refresh token");
//     return res
//       .status(401)
//       .json({ success: false, message: "Invalid refresh token" });
//   }

//   if (storedToken.expiredAt < new Date()) {
//     logger.warn("Expired refresh token");
//     await RefreshToken.deleteOne({ _id: storedToken._id }); // Clean up expired tokens
//     return res.status(401).json({
//       success: false,
//       message: "Refresh token has expired, please log in again",
//     });
//   }

//   // Find user associated with the token
//   const user = await Institution.findById(storedToken.user);
//   if (!user) {
//     logger.warn("User not found for refresh token");
//     await RefreshToken.deleteOne({ _id: storedToken._id }); // Clean up orphan tokens
//     return res.status(404).json({ success: false, message: "User not found" });
//   }

//   // Generate new access and refresh tokens
//   const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
//     user
//   );

//   // Delete the old refresh token and store the new one
//   await RefreshToken.deleteOne({ _id: storedToken._id });
//   await RefreshToken.create({
//     token: newRefreshToken,
//     user: user._id,
//     expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//   });

//   return res.status(200).json({
//     success: true,
//     accessToken,
//     refreshToken: newRefreshToken,
//   });
// });

// -------- Logout User --------
export const logOut = asyncErrorHandler(async (req, res) => {
  logger.info("Logout endpoint hit...");

  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token is missing");
      return res
        .status(400)
        .json({ success: false, message: "Refresh token is required" });
    }

    const tokenExists = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenExists) {
      logger.warn("Invalid refresh token");
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token" });
    }

    await RefreshToken.deleteOne({ token: refreshToken });

    logger.info("Refresh token deleted successfully");

    return res
      .status(200)
      .json({ success: true, message: "User logged out successfully" });
  } catch (error) {
    logger.error("Error during logout:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// -------- Request Password Reset OTP --------
export const requestPasswordResetOTP = asyncErrorHandler(async (req, res) => {
  logger.info("Password reset OTP requested...");

  const { email } = req.body;
  const user = await Institution.findOne({ email });

  if (!user) return genericPasswordResetResponse(res);

  const resetOTP = generateOTP();
  const resetPasswordExpiresAt = tokenExpiry();

  // Option 1: save with validation skipped
  user.resetPasswordToken = resetOTP;
  user.resetPasswordExpiresAt = resetPasswordExpiresAt;
  await user.save({ validateBeforeSave: false });

  await sendResetEmail(email, resetOTP);

  return genericPasswordResetResponse(res);
});

// -------- Reset Password --------
export const resetPassword = asyncErrorHandler(async (req, res) => {
  logger.info("Password reset with OTP initiated...");

  const { email, otp, newPassword } = req.body;

  logger.info(`Reset attempt for email: ${email} with OTP: ${otp}`);

  const user = await Institution.findOne({ email, resetPasswordToken: otp });
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
