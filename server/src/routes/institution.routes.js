import express from "express";
import {
  getAllInstitutions,
  getInstitutionById,
  updateInstitutionProfile,
  deleteInstitution,
  assignUser,
} from "../controllers/institution.controller.js";
import { upload } from "../middlewares/upload.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import {
  canAccessInstitution,
  canAssignUser,
} from "../middlewares/accessControl.middleware.js";

export const institutionProfileRoutes = express.Router();

/**
 * @swagger
 * tags:
 *   name: Institution
 *   description: Institution profile and management
 */

/**
 * @swagger
 * /institution-profile:
 *   get:
 *     summary: Get all institutions (Admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of institutions
 *       403:
 *         description: Forbidden
 */
institutionProfileRoutes.get(
  "/",
  authenticate,
  authorizeRoles("admin"),
  getAllInstitutions
);

/**
 * @swagger
 * /institution-profile/{id}:
 *   get:
 *     summary: Get institution by ID (Admin or self)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Institution ID
 *     responses:
 *       200:
 *         description: Institution found
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Institution not found
 */
institutionProfileRoutes.get(
  "/:id",
  authenticate,
  canAccessInstitution,
  getInstitutionById
);

/**
 * @swagger
 * /institution-profile/{id}:
 *   put:
 *     summary: Update institution profile (Admin or self)
 *     tags: [Institution]
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
 *         description: Institution ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [academy, training]
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Institution updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Institution not found
 */
institutionProfileRoutes.put(
  "/:id",
  authenticate,
  canAccessInstitution,
  upload.single("avatar"),
  updateInstitutionProfile
);

/**
 * @swagger
 * /institution-profile/{id}:
 *   delete:
 *     summary: Delete institution (Admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Institution ID
 *     responses:
 *       200:
 *         description: Institution deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Institution not found
 */
institutionProfileRoutes.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteInstitution
);

/**
 * @swagger
 * /institution-profile/assign-user:
 *   post:
 *     summary: Assign user (student or instructor) to institution
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - institutionId
 *               - userId
 *             properties:
 *               institutionId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User assigned successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Institution or user not found
 */
institutionProfileRoutes.post(
  "/assign-user",
  authenticate,
  canAssignUser,
  assignUser
);
