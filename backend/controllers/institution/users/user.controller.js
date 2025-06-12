import fs from "fs";
import { InstitutionUser } from "../../../models/usersModels/InstitutionUser .js";
import { asyncErrorHandler } from "../../../middlewares/asyncHandler.js";
import { logger } from "../../../utils/logger.js";
import {
  uploadsToCloudinary,
  deleteFromCloudinary,
} from "../../../config/cloudinary.js";
import mongoose from "mongoose";

// Utility for not found response
const notFoundResponse = (res, message = "User not found") => {
  logger.warn(message);
  return res.status(404).json({ success: false, message });
};

// GET /users
export const getAllUsers = asyncErrorHandler(async (req, res) => {
  logger.info("Fetching all users...");
  const users = await InstitutionUser.find({}).select("-password");

  if (!users.length) return notFoundResponse(res, "No users found");

  logger.info(`Fetched ${users.length} users`);
  res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: users,
  });
});

// GET /user/:id
export const getSingleUser = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Fetching user with ID: ${id}`);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    logger.warn(`Invalid ObjectId: ${id}`);
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }

  const user = await InstitutionUser.findById(id).select("-password");
  if (!user) return notFoundResponse(res);

  logger.info(`User with ID: ${id} fetched successfully`);
  res.status(200).json({
    success: true,
    message: "User fetched successfully",
    data: user,
  });
});

// PUT /user/:id
export const updatedUser = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Updating user with ID: ${id}`);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    logger.warn(`Invalid ObjectId: ${id}`);
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }

  const existingUser = await InstitutionUser.findById(id);
  if (!existingUser) return notFoundResponse(res);

  // Handle avatar upload
  if (req.file) {
    logger.info("Processing avatar...");

    if (existingUser.avatar?.publicId) {
      try {
        await deleteFromCloudinary(existingUser.avatar.publicId);
        logger.info("Old avatar deleted from Cloudinary");
      } catch (err) {
        logger.error("Error deleting old avatar:", err.message);
      }
    }

    try {
      const result = await uploadsToCloudinary(req.file.path);
      fs.unlinkSync(req.file.path);
      req.body.avatar = {
        url: result.secure_url,
        publicId: result.public_id,
      };
      logger.info("New avatar uploaded");
    } catch (err) {
      logger.error("Avatar upload failed:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Avatar upload failed" });
    }
  }

  delete req.body.password;
  delete req.body._id;

  const updated = await InstitutionUser.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  }).select("-password");

  logger.info(`User with ID: ${id} updated`);
  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: updated,
  });
});

// DELETE /user/:id
export const deleteUser = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Deleting user with ID: ${id}`);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    logger.warn(`Invalid ObjectId: ${id}`);
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }

  const user = await InstitutionUser.findByIdAndDelete(id);
  if (!user) return notFoundResponse(res);

  if (user.avatar?.publicId) {
    try {
      await deleteFromCloudinary(user.avatar.publicId);
      logger.info("User avatar deleted from Cloudinary");
    } catch (err) {
      logger.error("Error deleting avatar:", err.message);
    }
  }

  logger.info(`User with ID: ${id} deleted`);
  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});
