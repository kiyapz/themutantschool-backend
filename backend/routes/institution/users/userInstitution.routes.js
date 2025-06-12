import express from "express";
import {
  deleteUser,
  getAllUsers,
  getSingleUser,
  updatedUser,
} from "../../../controllers/institution/users/user.controller.js";
import { upload } from "../../../middlewares/uploads.js";

export const userInstutionRoutes = express.Router();

// More specific route declared first
userInstutionRoutes.get("/all-users", getAllUsers);
userInstutionRoutes.get("/user/:id", getSingleUser);
userInstutionRoutes.put("/user/:id", upload.single("avatar"), updatedUser);
userInstutionRoutes.delete("/user/:id", deleteUser);
