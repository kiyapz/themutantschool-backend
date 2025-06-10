import express from "express";
import {
  loginUser,
  signUpUser,
  verifyAccount,
  logOut,
  userRefreshToken,
  requestPasswordResetOTP,
  resetPassword,
  userName,
  verifyAcountToken,
} from "../controllers/auth.controller.js";
import { upload } from "../middlewares/uploads.js";

export const authRoutes = express.Router();
authRoutes.post("/register-username", userName);
authRoutes.post("/register", upload.single("file"), signUpUser);

authRoutes.post("/verify-account", verifyAccount);

authRoutes.post("/login", loginUser);

authRoutes.post("/refresh-token", userRefreshToken);

authRoutes.post("/logout", logOut);

authRoutes.post("/reset-token", requestPasswordResetOTP);

authRoutes.put("/reset-password", resetPassword);

authRoutes.post("/verification-token", verifyAcountToken);
