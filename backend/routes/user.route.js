import express from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUserProfile,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/uploads.js";

export const userRoutes = express.Router();

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User management and operations
 */

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Get list of all users
 *     tags: [User]
 *     responses:
 *       200:
 *         description: List of users
 */
userRoutes.get("/", getAllUsers);

/**
 * @swagger
 * /api/user/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         description: User ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data retrieved
 *       404:
 *         description: User not found
 */
userRoutes.get("/:id", getUserById);

/**
 * @swagger
 * /api/user/{id}:
 *   put:
 *     summary: Update user profile
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture upload
 *               username:
 *                 type: string
 *                 description: New username
 *               email:
 *                 type: string
 *                 description: New email
 *     parameters:
 *       - in: path
 *         name: id
 *         description: User ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile updated
 *       400:
 *         description: Invalid input
 */
userRoutes.put("/:id", upload.single("file"), updateUserProfile);

/**
 * @swagger
 * /api/user/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         description: User ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
userRoutes.delete("/:id", deleteUser);
