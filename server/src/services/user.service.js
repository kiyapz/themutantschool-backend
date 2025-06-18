import {
  deleteFromCloudinary,
  uploadsToCloudinary,
} from "../config/cloudinary.js";
import { User } from "../models/User.model.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";
/**
 * Get all users
 */
export const getAllUsers = async () => {
  const users = await User.find();
  return users.map((user) => user.toPublic());
};

/**
 * Get user by ID
 */

export const getUserById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid user ID");
  }
  const user = await User.findById(id);
  if (!user) throw new Error("User not found");
  return user.toPublic();
};
/**
 * Update user profile
 */

export const updateUserProfile = async (id, body, file) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid user ID");
  }

  const user = await User.findById(id);
  if (!user) {
    throw new Error("User not found");
  }

  if (file) {
    logger.info("Uploading new avatar to Cloudinary...");
    if (user.profile?.avatar?.publicId) {
      try {
        await deleteFromCloudinary(user.profile.avatar.publicId);
      } catch (err) {
        logger.error("Failed to delete old avatar:", err.message);
      }
    }

    const uploaded = await uploadsToCloudinary(file.buffer);
    body["profile.avatar"] = {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    };
  }

  // Prevent sensitive fields from being updated
  delete body._id;
  delete body.password;

  const updatedUser = await User.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) throw new Error("User not found");

  return updatedUser.toPublic();
};

/**
 * Delete user
 */
export const deleteUserById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid user ID");
  }

  const user = await User.findById(id);
  if (!user) {
    throw new Error("User not found");
  }

  await user.deleteOne();
  return true;
};
