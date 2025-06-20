import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import { createQuizController } from "../controllers/quiz.controller.js";

export const quizRoute = express.Router();

//create quiz
quizRoute.post(
  "/create",
  authenticate,
  authorizeRoles("institution", "instructor"),
  createQuizController
);
