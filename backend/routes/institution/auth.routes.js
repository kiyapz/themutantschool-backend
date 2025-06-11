import express from "express";
import {
  registerInstitution,
  verifyAccount,
  loginUser,
  resendVerifyAcountToken,
  logOut,
  requestPasswordResetOTP,
  resetPassword,
} from "../../controllers/institution/auth.controller.js";

export const instituteRoutes = express.Router();

//register
instituteRoutes.post("/register", registerInstitution);
//verify account
instituteRoutes.post("/verify-account", verifyAccount);

//login
instituteRoutes.post("/login", loginUser);

//request new verification token
instituteRoutes.post("/resend-token", resendVerifyAcountToken);

//refresh token

//lgout user
instituteRoutes.post("/logout", logOut);

//request password reset token
instituteRoutes.post("/password-token", requestPasswordResetOTP);

//reset password
instituteRoutes.put("/reset-password", resetPassword);
