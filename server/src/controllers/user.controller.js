import { logger } from "../utils/logger.js";
import { asyncHandler } from "../middlewares/ayncHandler.js";
import * as UserService from "../services/user.service.js";

// 🧑‍🤝‍🧑 Get all users
export const getAllUsers = asyncHandler(async (req, res) => {
  logger.info("Fetching all users...");
  const users = await UserService.getAllUsers();

  if (!users.length) {
    return res.status(404).json({ success: false, message: "No users found" });
  }

  res.status(200).json({ success: true, data: users });
});

// 🔍 Get user by ID
// 🔍 Get user by ID (self or admin)
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Fetching user by ID: ${id}`);

  const user = await UserService.getUserById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Access control: allow self or admin
  const isSelf = req.authUser?._id.toString() === id;
  const isAdmin = req.userRole === "admin";

  if (!isSelf && !isAdmin) {
    logger.warn(
      `Access denied for user ${req.authUser?._id} trying to access user ${id}`
    );
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  res.status(200).json({ success: true, data: user });
});

// 🛠 Update user profile
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Updating user profile with ID: ${id}`);
  const isSelf = req.authUser?._id.toString() === id;
  const isAdmin = req.userRole === "admin";

  if (!isSelf && !isAdmin) {
    logger.warn(
      `Access denied for user ${req.authUser?._id} trying to update user ${id}`
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

//  Delete user
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Deleting user ID: ${id}`);

  await UserService.deleteUserById(id);

  res.status(200).json({ success: true, message: "User deleted successfully" });
});
