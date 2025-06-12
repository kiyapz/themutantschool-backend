import express from "express";
import { upload } from "../../middlewares/uploads.js";
import {
  deleteInstitution,
  getAllInstitution,
  getSingleInstitution,
  updateInstitution,
} from "../../controllers/institution/user.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/protectedRoutes.js";

export const instituteUserRoutes = express.Router();
instituteUserRoutes
  .route("/")
  .get(authenticate("user"), authorizeRoles("admin"), getAllInstitution);

instituteUserRoutes
  .route("/:id")
  .get(authenticate("institution"), getSingleInstitution)
  .put(upload.single("avatar"), authenticate("institution"), updateInstitution)
  .delete(authenticate("institution"), deleteInstitution);
