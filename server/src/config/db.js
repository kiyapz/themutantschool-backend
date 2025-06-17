import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
export const connectDb = async () => {
  // MongoDB connection
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB connected successfully ${connection.connection.host}`);
  } catch (error) {
    logger.warn("error connecting to Database", error);
    process.exit(1);
  }
};
