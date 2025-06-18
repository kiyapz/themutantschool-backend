// controllers/institution.controller.js
import { logger } from "../utils/logger.js";
import { asyncHandler } from "../middlewares/ayncHandler.js";
import * as InstitutionService from "../services/institutions.service.js";

// 🏢 Get all institutions
export const getAllInstitutions = asyncHandler(async (req, res) => {
  logger.info("Fetching all institutions...");
  const institutions = await InstitutionService.getAllInstitutions();

  if (!institutions.length) {
    return res
      .status(404)
      .json({ success: false, message: "No institutions found" });
  }

  res.status(200).json({ success: true, data: institutions });
});

// 🔍 Get institution by ID
export const getInstitutionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Fetching institution by ID: ${id}`);

  const institution = await InstitutionService.getInstitutionById(id);

  if (!institution) {
    return res
      .status(404)
      .json({ success: false, message: "Institution not found" });
  }

  res.status(200).json({ success: true, data: institution });
});

// 🛠 Update institution profile
export const updateInstitutionProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Updating institution profile with ID: ${id}`);

  const updatedInstitution = await InstitutionService.updateInstitutionProfile(
    id,
    req.body,
    req.file
  );

  res.status(200).json({
    success: true,
    message: "Institution updated successfully",
    data: updatedInstitution,
  });
});

// ❌ Delete institution
export const deleteInstitution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Deleting institution ID: ${id}`);

  // Access control: allow if admin or institution itself

  await InstitutionService.deleteInstitutionById(id);

  res.status(200).json({
    success: true,
    message: "Institution deleted successfully",
  });
});

// ➕ Assign user to institution
export const assignUser = asyncHandler(async (req, res) => {
  const { institutionId, userId } = req.body;

  logger.info(`Assigning user ${userId} to institution ${institutionId}`);

  // Only admins or institution itself can assign users
  if (req.user.role !== "admin" && req.user._id.toString() !== institutionId) {
    return res.status(403).json({ message: "Access denied" });
  }

  const result = await InstitutionService.assignUserToInstitution(
    institutionId,
    userId
  );

  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      institution: result.institution,
      user: result.user,
    },
  });
});
