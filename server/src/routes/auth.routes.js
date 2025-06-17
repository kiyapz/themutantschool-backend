// routes/auth.routes.js
import express from "express";
import * as AuthController from "../controllers/auth.controller.js";

export const authRoutes = express.Router();

authRoutes.post("/register", AuthController.registerUser);
authRoutes.post("/login", AuthController.loginUser);
authRoutes.post("/verify", AuthController.verifyAccount);
authRoutes.post("/resend-verification", AuthController.resendVerification);
authRoutes.post("/check-username", AuthController.checkUsername);
authRoutes.post("/refresh-token", AuthController.refreshToken);
authRoutes.post("/logout", AuthController.logout);
authRoutes.post("/reset-password/request", AuthController.requestResetOTP);
authRoutes.post("/reset-password", AuthController.resetPassword);
