import express from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUserProfile,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/uploads.js";

export const userRoutes = express.Router();

// GET all users
userRoutes.get("/", getAllUsers);

// GET user by ID
userRoutes.get("/:id", getUserById);

// PUT update user profile
userRoutes.put("/:id", upload.single("file"), updateUserProfile);

// DELETE user
userRoutes.delete("/:id", deleteUser);
