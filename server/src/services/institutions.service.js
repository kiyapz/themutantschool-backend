// services/institution.service.js
import {
  deleteFromCloudinary,
  uploadsToCloudinary,
} from "../config/cloudinary.js";
import { Institution } from "../models/Institution.model.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";

/**
 * Get all institutions (excluding sensitive fields)
 */
export const getAllInstitutions = async () => {
  const institutions = await Institution.find().select("-password");
  return institutions;
};

/**
 * Get institution by ID
 */
export const getInstitutionById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid institution ID");
  }

  const institution = await Institution.findById(id).select("-password");
  return institution;
};

/**
 * Update institution profile
 * @param {string} id Institution ID
 * @param {object} body Data to update
 * @param {object} file Optional avatar file buffer
 */
export const updateInstitutionProfile = async (id, body, file) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid institution ID");
  }

  const institution = await Institution.findById(id);
  if (!institution) {
    throw new Error("Institution not found");
  }

  // Handle avatar upload if file provided
  if (file) {
    logger.info("Uploading new avatar to Cloudinary...");

    if (institution.avatar?.publicId) {
      try {
        await deleteFromCloudinary(institution.avatar.publicId);
      } catch (err) {
        logger.error("Failed to delete old avatar:", err.message);
      }
    }

    const uploaded = await uploadsToCloudinary(file.buffer);
    body.avatar = {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    };
  }

  // Prevent sensitive fields from being updated
  delete body._id;
  delete body.password;

  const updatedInstitution = await Institution.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  }).select("-password");

  return updatedInstitution;
};

/**
 * Delete institution by ID
 */
export const deleteInstitutionById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid institution ID");
  }

  const institution = await Institution.findById(id);
  if (!institution) {
    throw new Error("Institution not found");
  }

  await institution.deleteOne();
  return true;
};
