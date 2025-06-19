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
 * /api/user-profile:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user objects
 *       403:
 *         description: Forbidden
 */
userRoutes.get("/", authenticate, authorizeRoles("admin"), getAllUsers);

/**
 * @swagger
 * /api/user-profile/{id}:
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
 *         description: Not found
 */
userRoutes.get("/:id", authenticate, canAccessUser, getUserById);

/**
 * @swagger
 * /api/user-profile/{id}:
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
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *       - in: formData
 *         name: avatar
 *         type: file
 *         description: Profile avatar image file
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: User profile updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
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
 * /api/user-profile/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
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
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
userRoutes.delete("/:id", authenticate, authorizeRoles("admin"), deleteUser);
