import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import { createCourseController } from "../controllers/mission.controller.js";
import { upload } from "../middlewares/upload.middleware.js";

export const missionRoute = express.Router();

// Route: POST /api/missions/create
// Access: Instructor or Institution
missionRoute.post(
  "/create",
  authenticate,
  authorizeRoles("instructor", "institution"),
  upload.single("thumbnail"),
  createCourseController
);
