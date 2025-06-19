import { logger } from "../utils/logger.js";
import { asyncHandler } from "../middlewares/ayncHandler.js";
import * as UserService from "../services/user.service.js";
import mongoose from "mongoose";
// 🧑‍🤝‍🧑 Get all users (Admin only)
export const getAllUsers = asyncHandler(async (req, res) => {
  logger.info("Fetching all users...");

  // Ensure only admin can access this
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  const users = await UserService.getAllUsers();
  if (!users.length) {
    return res.status(404).json({ success: false, message: "No users found" });
  }

  res.status(200).json({ success: true, data: users });
});

// 🔍 Get user by ID (Self or Admin)
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Fetching user by ID: ${id}`);

  const user = await UserService.getUserById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const isSelf = req.user._id.toString() === id;
  const isAdmin = req.user.role === "admin";

  if (!isSelf && !isAdmin) {
    logger.warn(`Access denied for user ${req.user._id} to view user ${id}`);
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  res.status(200).json({ success: true, data: user });
});

// 🛠 Update user profile (Self or Admin)
// 🛠 Update user profile
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Updating user profile with ID: ${id}`);

  const isSelf = req.user._id.toString() === id;
  const isAdmin = req.user.role === "admin";

  if (!isSelf && !isAdmin) {
    logger.warn(
      `Access denied for user ${req.user._id} trying to update user ${id}`
    );
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  const updatedUser = await UserService.updateUserProfile(
    id,
    req.body,
    req.file
  );

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: updatedUser,
  });
});

// ❌ Delete user (Admin or Self)
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Deleting user ID: ${id}`);

  const isSelf = req.user._id.toString() === id;
  const isAdmin = req.user.role === "admin";

  if (!isSelf && !isAdmin) {
    logger.warn(`Access denied for user ${req.user._id} to delete user ${id}`);
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  await UserService.deleteUserById(id);

  res.status(200).json({ success: true, message: "User deleted successfully" });
});
