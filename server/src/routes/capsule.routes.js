import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import { createCapsuleController } from "../controllers/capsule.controller.js";

export const capsuleRoutes = express.Router();

//create capsule
capsuleRoutes.post(
  "/create",
  authenticate,
  authorizeRoles("institution", "instructor"),
  upload.single("video"),
  createCapsuleController
);
