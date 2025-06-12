import express from "express";
import {
  loginInstitutionUser,
  registerInstitutionUser,
  resendInstitutionUserToken,
  verifyInstitutionUser,
  requestInstitutionUserPasswordReset,
  resetInstitutionUserPassword,
  logoutInstitutionUser,
} from "../../../controllers/institution/users/auth.controller.js";

export const instituteUserAuthRoutes = express.Router();

//Register user
instituteUserAuthRoutes.post("/user/register", registerInstitutionUser);
//verify user
instituteUserAuthRoutes.post("/user/verfiy-account", verifyInstitutionUser);
//Login user
instituteUserAuthRoutes.post("/user/login", loginInstitutionUser);
//resend verification token
instituteUserAuthRoutes.post(
  "/user/resend-verification-token",
  resendInstitutionUserToken
);
//request send password
instituteUserAuthRoutes.post(
  "/user/request-password-reset-token",
  requestInstitutionUserPasswordReset
);

//reset password
instituteUserAuthRoutes.post(
  "/user/reset-password",
  resetInstitutionUserPassword
);

//logout
instituteUserAuthRoutes.post("/user/logout", logoutInstitutionUser);
