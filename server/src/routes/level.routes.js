import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import { createLevelController } from "../controllers/level.controller.js";

export const levelRoutes = express.Router();

//create level
levelRoutes.post(
  "/create",
  authenticate,
  authorizeRoles("institution", "instructor"),
  createLevelController
);
