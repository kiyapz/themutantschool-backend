// routes/institution.routes.js
import express from "express";
import {
  getAllInstitutions,
  getInstitutionById,
  updateInstitutionProfile,
  deleteInstitution,
} from "../controllers/institution.controller.js";
import { upload } from "../middlewares/upload.middleware.js";
export const institutionProfileRoutes = express.Router();

// Admin only route to get all institutions
institutionProfileRoutes.get("/", getAllInstitutions);

// Get institution by ID (admin or self)
institutionProfileRoutes.get("/:id", getInstitutionById);

// Update institution profile (admin or self), with optional file upload
institutionProfileRoutes.put(
  "/:id",
  upload.single("avatar"),
  updateInstitutionProfile
);

// Delete institution (admin or self)
institutionProfileRoutes.delete("/:id", deleteInstitution);
