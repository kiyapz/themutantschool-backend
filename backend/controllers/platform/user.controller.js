import { User } from "../../models/usersModels/user.model.js";
import { asyncErrorHandler } from "../../middlewares/asyncHandler.js";
import { logger } from "../../utils/logger.js";
import {
  uploadsToCloudinary,
  deleteFromCloudinary,
} from "../../config/cloudinary.js";
import fs from "fs";
import mongoose from "mongoose";

// 🧑‍🤝‍🧑 Get all users (admin only)
export const getAllUsers = asyncErrorHandler(async (req, res) => {
  logger.info("GET /users - Fetching all users...");
  const users = await User.find({}).select("-password");

  if (!users.length) {
    return res.status(404).json({
      success: false,
      message: "No users found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: users,
  });
});

// 🔍 Get user by ID (admin or self)
export const getUserById = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`GET /users/${id} - Fetching user by ID...`);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }

  const user = await User.findById(id).select("-password");

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Access control: admin or self
  if (req.user.role !== "admin" && req.user._id.toString() !== id) {
    return res.status(403).json({ message: "Access denied" });
  }

  res.status(200).json({
    success: true,
    message: "User fetched successfully",
    data: user,
  });
});

// PUT /users/:id - Update user profile (admin or self)// PUT /users/:id - Update user profile (admin or self)
// PUT /users/:id - Update user profile (admin or self)
export const updateUserProfile = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Updating user profile with ID: ${id}`);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Access control (admin or self)
  if (req.user.role !== "admin" && req.user._id.toString() !== id) {
    return res.status(403).json({ message: "Access denied" });
  }

  // Handle avatar upload
  if (req.file) {
    logger.info("Processing new avatar...");

    if (user.avatar?.publicId) {
      try {
        await deleteFromCloudinary(user.avatar.publicId);
      } catch (err) {
        logger.error("Error deleting old avatar:", err.message);
      }
    }

    try {
      const uploadResult = await uploadsToCloudinary(req.file.path);
      fs.unlinkSync(req.file.path);

      req.body.avatar = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      };
    } catch (uploadError) {
      logger.error("Avatar upload failed:", uploadError.message);
      return res
        .status(500)
        .json({ success: false, message: "Avatar upload failed" });
    }
  }

  // Prevent _id or password from being overwritten accidentally
  delete req.body._id;
  delete req.body.password;

  const updatedUser = await User.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  }).select("-password");

  res.status(200).json({
    success: true,
    message: "User profile updated successfully",
    data: updatedUser,
  });
});

// ❌ Delete user (admin or self)
export const deleteUser = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`DELETE /users/${id} - Deleting user...`);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (req.user.role !== "admin" && req.user._id.toString() !== id) {
    return res.status(403).json({ message: "Access denied" });
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});
