import express from "express";
import * as AuthController from "../controllers/auth.controller.js";

export const authRoutes = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [student, instructor, affiliate, admin]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or email/username exists
 */
authRoutes.post("/register", AuthController.registerUser);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful (accessToken in header, refreshToken in cookie)
 *       401:
 *         description: Invalid credentials
 */
authRoutes.post("/login", AuthController.loginUser);

/**
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Verify account using OTP
 *     tags: [Auth]
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
 *         description: Account verified
 *       400:
 *         description: Invalid token or already verified
 */
authRoutes.post("/verify", AuthController.verifyAccount);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Resend verification OTP
 *     tags: [Auth]
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
 *         description: User not found
 */
authRoutes.post("/resend-verification", AuthController.resendVerification);

/**
 * @swagger
 * /auth/check-username:
 *   post:
 *     summary: Check if username is available
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Username is available
 *       409:
 *         description: Username already taken
 */
authRoutes.post("/check-username", AuthController.checkUsername);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Get new access token using refresh token cookie
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid or expired token
 */
authRoutes.post("/refresh-token", AuthController.refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user (clears refresh token)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User logged out
 */
authRoutes.post("/logout", AuthController.logout);

/**
 * @swagger
 * /auth/reset-password/request:
 *   post:
 *     summary: Request a password reset OTP
 *     tags: [Auth]
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
 *         description: OTP sent if email exists
 */
authRoutes.post("/reset-password/request", AuthController.requestResetOTP);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
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
 *         description: Invalid OTP or weak password
 */
authRoutes.post("/reset-password", AuthController.resetPassword);
