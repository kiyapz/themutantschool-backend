import express from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUserProfile,
} from "../../controllers/platform/user.controller.js";
import { upload } from "../../middlewares/uploads.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/protectedRoutes.js";

export const userRoutes = express.Router();

// Admin: Get all users
userRoutes.get("/", authenticate("user"), authorizeRoles("admin"), getAllUsers);

// Admin OR self: Get single user by ID
userRoutes.get("/:id", authenticate("user"), getUserById);

// Admin OR self: Update profile (with avatar upload)
userRoutes.put(
  "/:id",
  authenticate("user"),
  upload.single("file"),
  updateUserProfile
);

// Admin only: Delete user
userRoutes.delete(
  "/:id",
  authenticate("user"),
  authorizeRoles("admin"),
  deleteUser
);
