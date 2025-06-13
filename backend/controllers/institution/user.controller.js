import fs from "fs";
import { logger } from "../../utils/logger.js";
import { asyncErrorHandler } from "../../middlewares/asyncHandler.js";
import { Institution } from "../../models/usersModels/institution.model.js";
import {
  uploadsToCloudinary,
  deleteFromCloudinary,
} from "../../config/cloudinary.js";

// Utility for not found response
const notFoundResponse = (res, message = "Institution not found") => {
  logger.warn(message);
  return res.status(404).json({ success: false, message });
};

// @route  GET /api/institutions
export const getAllInstitution = asyncErrorHandler(async (req, res) => {
  logger.info("Fetching all institutions...");
  const institutions = await Institution.find({}).select("-password");

  if (!institutions.length)
    return notFoundResponse(res, "No institutions found");

  res.status(200).json({
    success: true,
    message: "Institutions fetched successfully",
    data: institutions,
  });
});

// @route  GET /api/institutions/:id
export const getSingleInstitution = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Fetching institution with ID: ${id}`);

  const institution = await Institution.findById(id).select("-password");
  if (!institution) return notFoundResponse(res);

  res.status(200).json({
    success: true,
    message: "Institution fetched successfully",
    data: institution,
  });
});

// @route  PUT /api/institutions/:id
export const updateInstitution = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Updating institution with ID: ${id}`);

  // Debug logs to check incoming data
  console.log("DEBUG - req.body:", req.body);
  console.log("DEBUG - req.file:", req.file);

  const institution = await Institution.findById(id);
  if (!institution) return notFoundResponse(res);

  // Handle avatar upload
  if (req.file) {
    logger.info("Processing new avatar...");

    // Delete old avatar from Cloudinary
    if (institution.avatar?.publicId) {
      try {
        await deleteFromCloudinary(institution.avatar.publicId);
      } catch (error) {
        logger.error(
          "Error deleting old avatar from Cloudinary:",
          error.message
        );
      }
    }

    // Upload new avatar to Cloudinary
    try {
      const uploadResult = await uploadsToCloudinary(req.file.path);
      fs.unlinkSync(req.file.path);

      // Ensure req.body is an object before adding avatar field
      if (!req.body || typeof req.body !== "object") {
        req.body = {};
      }
      req.body.avatar = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      };
    } catch (uploadError) {
      logger.error("Avatar upload failed:", uploadError.message);
      return res
        .status(500)
        .json({ success: false, message: "Avatar upload failed" });
    }
  }

  // Make sure req.body is an object before deleting sensitive fields
  if (!req.body || typeof req.body !== "object") {
    req.body = {};
  }

  // Prevent password or _id from being overwritten accidentally
  // delete req.body.password;
  // delete req.body._id;

  // Perform the update
  const updatedInstitution = await Institution.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  }).select("-password");

  res.status(200).json({
    success: true,
    message: "Institution updated successfully",
    data: updatedInstitution,
  });
});

// @route  DELETE /api/institutions/:id
export const deleteInstitution = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Deleting institution with ID: ${id}`);

  const institution = await Institution.findByIdAndDelete(id);
  if (!institution) return notFoundResponse(res);

  if (institution.avatar?.publicId) {
    try {
      await deleteFromCloudinary(institution.avatar.publicId);
    } catch (error) {
      logger.error(
        "Error deleting avatar during institution deletion:",
        error.message
      );
    }
  }

  res.status(200).json({
    success: true,
    message: "Institution deleted successfully",
  });
});
