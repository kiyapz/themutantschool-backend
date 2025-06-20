import { Level } from "../models/Level.model.js";
import { Mission } from "../models/Mission.model.js";
import { logger } from "../utils/logger.js";

export const createLevel = async (body) => {
  const { title, order, missionId } = body;

  if (!title || !order || !missionId) {
    throw new Error("Missing required fields: title, order, or missionId.");
  }

  const level = new Level({
    title,
    mission: missionId,
    order,
  });

  const savedLevel = await level.save();

  // Push level into the mission
  await Mission.findByIdAndUpdate(missionId, {
    $push: { levels: savedLevel._id },
  });

  logger.info(`✅ Level created with ID: ${savedLevel._id}`);
  return savedLevel;
};
