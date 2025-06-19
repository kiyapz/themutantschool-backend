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
 *   description: Institution profile management
 */

/**
 * @swagger
 * /api/institution-profile:
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
 * /api/institution-profile/{id}:
 *   get:
 *     summary: Get institution by ID (Admin or self)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Institution ID
 *     responses:
 *       200:
 *         description: Institution found
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
institutionProfileRoutes.get(
  "/:id",
  authenticate,
  canAccessInstitution,
  getInstitutionById
);

/**
 * @swagger
 * /api/institution-profile/{id}:
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
 *         schema:
 *           type: string
 *         required: true
 *         description: Institution ID
 *       - in: formData
 *         name: avatar
 *         type: file
 *         description: Institution logo image
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               codename:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Institution updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
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
 * /api/institution-profile/{id}:
 *   delete:
 *     summary: Delete an institution (Admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Institution ID
 *     responses:
 *       200:
 *         description: Institution deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
institutionProfileRoutes.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteInstitution
);

/**
 * @swagger
 * /api/institution-profile/assign-user:
 *   post:
 *     summary: Assign a student or instructor to an institution
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [institutionId, userId]
 *             properties:
 *               institutionId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User assigned successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Institution or user not found
 */
institutionProfileRoutes.post(
  "/assign-user",
  authenticate,
  canAccessInstitution,
  assignUser
);
