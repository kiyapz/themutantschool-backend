import { uploadsToCloudinary } from "../config/cloudinary.js";
import { asyncErrorHandler } from "../middlewares/asyncHandler.js";
import { User } from "../models/user.model.js";
import { generateTokens } from "../utils/generateTokens.js";
import { logger } from "../utils/logger.js";
import { sendVerificationEmail } from "../utils/sendMail.js";
import { validationRegistration } from "../utils/validation.js";

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
