import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import { submitQuizAttemptController } from "../controllers/submitQuizAttemptController.controller.js";

export const submitQuizAttemptRoutes = express.Router();

//submit quiz attempy
submitQuizAttemptRoutes.post(
  "/submit-quiz",
  authenticate,
  authorizeRoles("student"),
  submitQuizAttemptController
);
