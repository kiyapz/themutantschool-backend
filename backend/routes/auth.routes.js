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

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user account management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture upload
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input
 */
authRoutes.post("/register", upload.single("file"), signUpUser);

/**
 * @swagger
 * /api/auth/verify-account:
 *   post:
 *     summary: Verify user account with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verificationToken
 *             properties:
 *               verificationToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account verified
 *       400:
 *         description: Invalid or expired token
 */
authRoutes.post("/verify-account", verifyAccount);

/**
 * @swagger
 * /api/auth/login:
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
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns auth token
 *       401:
 *         description: Invalid credentials
 */
authRoutes.post("/login", loginUser);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
authRoutes.post("/refresh-token", userRefreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user and invalidate token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
authRoutes.post("/logout", logOut);

/**
 * @swagger
 * /api/auth/reset-token:
 *   post:
 *     summary: Request password reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset token sent if email exists
 */
authRoutes.post("/reset-token", resetPasswordToken);

/**
 * @swagger
 * /api/auth/reset-password/{resetToken}:
 *   put:
 *     summary: Reset password using reset token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: resetToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
authRoutes.put("/reset-password/:resetToken", resetPasword);
