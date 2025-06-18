// routes/institutionAuth.routes.js
import express from "express";
import * as InstitutionAuth from "../controllers/authInstitution.controller.js";

export const institutionRoutes = express.Router();

institutionRoutes.post("/register", InstitutionAuth.registerInstitution);
institutionRoutes.post("/login", InstitutionAuth.loginInstitution);
institutionRoutes.post("/verify", InstitutionAuth.verifyInstitutionAccount);
institutionRoutes.post(
  "/resend-verification",
  InstitutionAuth.resendInstitutionVerification
);
institutionRoutes.post("/check-codename", InstitutionAuth.checkCodename);
institutionRoutes.post(
  "/refresh-token",
  InstitutionAuth.refreshInstitutionToken
);
institutionRoutes.post("/logout", InstitutionAuth.logoutInstitution);
institutionRoutes.post(
  "/request-reset",
  InstitutionAuth.requestInstitutionResetOTP
);
institutionRoutes.post(
  "/reset-password",
  InstitutionAuth.resetInstitutionPassword
);
