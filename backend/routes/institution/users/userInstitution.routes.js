import express from "express";
import {
  deleteUser,
  getAllUsers,
  getSingleUser,
  updatedUser,
} from "../../../controllers/institution/users/user.controller.js";
import { upload } from "../../../middlewares/uploads.js";
import { authenticate } from "../../../middlewares/authMiddleware.js";

export const userInstutionRoutes = express.Router();

// More specific route declared first
userInstutionRoutes.get("/all-users", authenticate("institution"), getAllUsers);
userInstutionRoutes.get(
  "/user/:id",
  authenticate("institutionUser"),
  getSingleUser
);
userInstutionRoutes.put(
  "/user/:id",
  upload.single("avatar"),
  authenticate("institutionUser"),
  updatedUser
);
userInstutionRoutes.delete(
  "/user/:id",
  authenticate("institutionUser"),
  deleteUser
);
