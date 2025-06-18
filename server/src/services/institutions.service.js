// services/institution.service.js
import {
  deleteFromCloudinary,
  uploadsToCloudinary,
} from "../config/cloudinary.js";
import { Institution } from "../models/Institution.model.js";
import { User } from "../models/User.model.js";
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

/**
 * Assign a user (student or instructor) to an institution
 */
export const assignUserToInstitution = async (institutionId, userId) => {
  if (
    !mongoose.Types.ObjectId.isValid(institutionId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new Error("Invalid institution or user ID");
  }

  const institution = await Institution.findById(institutionId);
  if (!institution) throw new Error("Institution not found");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Assign institution to user
  user.institution = institution._id;
  await user.save();

  // Push to correct list in institution
  if (user.role === "student") {
    if (!institution.students.includes(user._id)) {
      institution.students.push(user._id);
    }
  } else if (user.role === "instructor") {
    if (!institution.instructors.includes(user._id)) {
      institution.instructors.push(user._id);
    }
  } else {
    throw new Error("User must be a student or instructor to be assigned");
  }

  await institution.save();

  return {
    message: `${user.role} assigned to institution`,
    institution,
    user,
  };
};
