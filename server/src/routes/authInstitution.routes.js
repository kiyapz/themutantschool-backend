import express from "express";
import * as InstitutionAuth from "../controllers/authInstitution.controller.js";

export const institutionRoutes = express.Router();

/**
 * @swagger
 * tags:
 *   name: InstitutionAuth
 *   description: Institution authentication and verification
 */

/**
 * @swagger
 * /api/institution/register:
 *   post:
 *     summary: Register a new institution
 *     tags: [InstitutionAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, codename, password, type]
 *             properties:
 *               name:
 *                 type: string
 *               codename:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [academy, training]
 *     responses:
 *       201:
 *         description: Institution registered
 *       400:
 *         description: Validation error
 */
institutionRoutes.post("/register", InstitutionAuth.registerInstitution);

/**
 * @swagger
 * /api/institution/login:
 *   post:
 *     summary: Login institution
 *     tags: [InstitutionAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
institutionRoutes.post("/login", InstitutionAuth.loginInstitution);

/**
 * @swagger
 * /api/institution/verify:
 *   post:
 *     summary: Verify institution account using OTP
 *     tags: [InstitutionAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, token]
 *             properties:
 *               email:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification successful
 *       400:
 *         description: Token expired or already verified
 */
institutionRoutes.post("/verify", InstitutionAuth.verifyInstitutionAccount);

/**
 * @swagger
 * /api/institution/resend-verification:
 *   post:
 *     summary: Resend verification token
 *     tags: [InstitutionAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token resent
 *       404:
 *         description: Institution not found
 */
institutionRoutes.post(
  "/resend-verification",
  InstitutionAuth.resendInstitutionVerification
);

/**
 * @swagger
 * /api/institution/check-codename:
 *   post:
 *     summary: Check if codename is available
 *     tags: [InstitutionAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [codename]
 *             properties:
 *               codename:
 *                 type: string
 *     responses:
 *       200:
 *         description: Codename is available
 *       409:
 *         description: Codename already taken
 */
institutionRoutes.post("/check-codename", InstitutionAuth.checkCodename);

/**
 * @swagger
 * /api/institution/refresh-token:
 *   post:
 *     summary: Get new access token using institution refresh token
 *     tags: [InstitutionAuth]
 *     security:
 *       - cookieRefreshToken: []
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid or expired token
 */
institutionRoutes.post(
  "/refresh-token",
  InstitutionAuth.refreshInstitutionToken
);

/**
 * @swagger
 * /api/institution/logout:
 *   post:
 *     summary: Logout institution
 *     tags: [InstitutionAuth]
 *     security:
 *       - cookieRefreshToken: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
institutionRoutes.post("/logout", InstitutionAuth.logoutInstitution);

/**
 * @swagger
 * /api/institution/request-reset:
 *   post:
 *     summary: Request a password reset OTP
 *     tags: [InstitutionAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset OTP sent
 */
institutionRoutes.post(
  "/request-reset",
  InstitutionAuth.requestInstitutionResetOTP
);

/**
 * @swagger
 * /api/institution/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [InstitutionAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired OTP
 */
institutionRoutes.post(
  "/reset-password",
  InstitutionAuth.resetInstitutionPassword
);
