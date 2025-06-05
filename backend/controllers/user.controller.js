import { User } from "../models/user.model.js";
import { asyncErrorHandler } from "../middlewares/asyncHandler.js";
import { logger } from "../utils/logger.js";
import {
  uploadsToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import fs from "fs";

// Get all users
export const getAllUsers = asyncErrorHandler(async (req, res) => {
  logger.info("GET /users - Fetching all users...");
  const users = await User.find({}).select("-password");

  if (!users || users.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No users found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: users,
  });
});

// Get user by ID
export const getUserById = asyncErrorHandler(async (req, res) => {
  logger.info(`GET /users/${req.params.id} - Fetching user by ID...`);
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "User fetched successfully",
    data: user,
  });
});

// Update user profile
export const updateUserProfile = asyncErrorHandler(async (req, res) => {
  logger.info(`PUT /users/${req.params.id} - Updating user profile...`);

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (req.body.password) {
    return res.status(400).json({
      success: false,
      message: "Use the dedicated password update endpoint",
    });
  }

  const fieldsToUpdate = [
    "firstName",
    "lastName",
    "username",
    "email",
    "gender",
    "country",
    "dob",
  ];

  fieldsToUpdate.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  if (req.file) {
    if (user.avatar?.publicId) {
      await deleteFromCloudinary(user.avatar.publicId);
    }

    const result = await uploadsToCloudinary(req.file.path);
    user.avatar = {
      url: result.secure_url,
      publicId: result.public_id,
    };

    fs.unlinkSync(req.file.path);
  }

  await user.save();

  return res.status(200).json({
    success: true,
    message: "User profile updated successfully",
    data: user,
  });
});

// Delete user
export const deleteUser = asyncErrorHandler(async (req, res) => {
  logger.info(`DELETE /users/${req.params.id} - Deleting user...`);

  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});
