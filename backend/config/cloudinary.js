import { v2 as cloudinary } from "cloudinary";
import { logger } from "../utils/logger.js";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export const uploadsToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });

    if (!result || !result.secure_url) {
      throw new Error("Cloudinary upload failed: secure_url missing");
    }

    logger.info(`Uploaded to Cloudinary: ${result.secure_url}`);
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (err) {
    logger.error("Cloudinary upload error:", err.message);
    throw err; // Let it propagate to the controller
  }
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (err) {
    logger.error("Cloudinary delete error:", err.message);
    throw err;
  }
};
