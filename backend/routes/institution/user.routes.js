import express from "express";
import { upload } from "../../middlewares/uploads.js";
import {
  deleteInstitution,
  getAllInstitution,
  getSingleInstitution,
  updateInstitution,
} from "../../controllers/institution/user.controller.js";

export const instituteUserRoutes = express.Router();
instituteUserRoutes.route("/").get(getAllInstitution);

instituteUserRoutes
  .route("/:id")
  .get(getSingleInstitution)
  .put(upload.single("avatar"), updateInstitution)
  .delete(deleteInstitution);
