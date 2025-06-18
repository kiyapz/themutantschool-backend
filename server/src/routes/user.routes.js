import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUserProfile,
  deleteUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/upload.middleware.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";

export const userRoutes = express.Router();

// GET /api/users — Get all users (admin only)
userRoutes.get("/", verifyToken, authorizeRoles("admin"), getAllUsers);

// GET /api/users/:id — Get a single user by ID (admin or self)
userRoutes.get("/:id", verifyToken, getUserById);

// PUT /api/users/:id — Update user profile (admin or self)
userRoutes.put("/:id", verifyToken, upload.single("avatar"), updateUserProfile);

// DELETE /api/users/:id — Delete a user (admin or self)
userRoutes.delete("/:id", verifyToken, authorizeRoles("admin"), deleteUser);
