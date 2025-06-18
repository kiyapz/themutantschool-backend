import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUserProfile,
  deleteUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/upload.middleware.js";

export const userRoutes = express.Router();

// GET /api/users — Get all users (admin only)
userRoutes.get("/", getAllUsers);

// GET /api/users/:id — Get a single user by ID (admin or self)
userRoutes.get("/:id", getUserById);

// PUT /api/users/:id — Update user profile (admin or self)
userRoutes.put("/:id", upload.single("avatar"), updateUserProfile);

// DELETE /api/users/:id — Delete a user (admin or self)
userRoutes.delete("/:id", deleteUser);
