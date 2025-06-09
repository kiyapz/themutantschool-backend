import express from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUserProfile,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/uploads.js";
import { isAdmin } from "../middlewares/protectedRoutes.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

export const userRoutes = express.Router();

userRoutes.get("/", authMiddleware, isAdmin, getAllUsers);

userRoutes.get("/:id", authMiddleware, getUserById);

userRoutes.put(
  "/:id",
  upload.single("file"),
  authMiddleware,
  updateUserProfile
);

userRoutes.delete("/:id", deleteUser);
