import { uploadsToCloudinary } from "../config/cloudinary.js";
import { Mission } from "../models/Mission.model.js";
import { logger } from "../utils/logger.js";

export const createCourse = async (body, file) => {
  const { title, description, category, instructorId, institutionId } = body;

  if (!title || !description || !category) {
    throw new Error(
      "Missing required course fields: title, description, or category"
    );
  }

  // ✅ Allow either instructor or institution
  if (!instructorId && !institutionId) {
    throw new Error("Mission must be created by an instructor or institution.");
  }

  let thumbnail = {
    url: "",
    publicId: "",
  };

  if (file) {
    const uploads = await uploadsToCloudinary(file.buffer);
    thumbnail = {
      url: uploads.secure_url,
      publicId: uploads.public_id,
    };
  }

  const mission = new Mission({
    title,
    description,
    category,
    instructor: instructorId || undefined,
    institution: institutionId || undefined,
    thumbnail,
    levels: [],
  });

  const savedMission = await mission.save();
  logger.info(`✅ Mission created with ID: ${savedMission._id}`);
  return savedMission;
};
