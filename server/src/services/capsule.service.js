import { uploadsToCloudinary } from "../config/cloudinary.js";
import { Capsule } from "../models/Capsule.js";
import { Level } from "../models/Level.model.js";
import { logger } from "../utils/logger.js";

export const createCapsule = async (body, file) => {
  const { title, order, duration, level } = body;

  // ✅ Check all required fields
  if (!title || !order || !duration || !level || !file) {
    throw new Error(
      "Missing required fields: title, duration, level, order, or video file."
    );
  }

  // ✅ Upload video
  const uploads = await uploadsToCloudinary(file.buffer);

  const videoUrl = {
    url: uploads.secure_url,
    publicId: uploads.public_id,
  };

  // ✅ Create capsule
  const capsule = new Capsule({
    title,
    videoUrl,
    duration,
    level,
    order,
  });

  await capsule.save();

  // ✅ Push capsule ID into level
  await Level.findByIdAndUpdate(level, {
    $push: { capsules: capsule._id },
  });

  logger.info(`✅ Capsule created with ID: ${capsule._id}`);

  return capsule;
};
