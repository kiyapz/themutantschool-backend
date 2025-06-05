import express from "express";
import {
  loginUser,
  signUpUser,
  verifyAccount,
  logOut,
  userRefreshToken,
  resetPasswordToken,
  resetPasword,
} from "../controllers/auth.controller.js";
import { upload } from "../middlewares/uploads.js";

export const authRoutes = express.Router();
//create user account
authRoutes.post("/register", upload.single("file"), signUpUser);
//verify account
authRoutes.post("/verify-account", verifyAccount);
//Login User
authRoutes.post("/login", loginUser);
//Refresh Token
authRoutes.post("/refresh-token", userRefreshToken);
//logout
authRoutes.post("/logout", logOut);
//reset token for pasword
authRoutes.post("/reset-token", resetPasswordToken);
//Rest password
authRoutes.put("/reset-password/:resetToken", resetPasword);
