import express from "express";
import {
  signUpUser,
  verifyAccount,
} from "../controllers.js/auth.controller.js";
import { upload } from "../middlewares/uploads.js";

export const authRoutes = express.Router();
//create user account
authRoutes.post("/register", upload.single("file"), signUpUser);
//verify account
authRoutes.post("/verify-account", verifyAccount);
