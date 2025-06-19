import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUserProfile,
  deleteUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/upload.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { canAccessUser } from "../middlewares/accessControl.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";

export const userRoutes = express.Router();

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User profile operations
 */

/**
 * @swagger
 * /user-profile:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       403:
 *         description: Forbidden
 */
userRoutes.get("/", authenticate, authorizeRoles("admin"), getAllUsers);

/**
 * @swagger
 * /user-profile/{id}:
 *   get:
 *     summary: Get user by ID (Admin or self)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
userRoutes.get("/:id", authenticate, canAccessUser, getUserById);

/**
 * @swagger
 * /user-profile/{id}:
 *   put:
 *     summary: Update user profile (Admin or self)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: formData
 *         name: avatar
 *         type: file
 *         description: Optional avatar file
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               username:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
userRoutes.put(
  "/:id",
  authenticate,
  canAccessUser,
  upload.single("avatar"),
  updateUserProfile
);

/**
 * @swagger
 * /user-profile/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
userRoutes.delete("/:id", authenticate, authorizeRoles("admin"), deleteUser);
