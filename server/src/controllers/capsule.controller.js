import { asyncHandler } from "../middlewares/ayncHandler.js";
import { createCapsule } from "../services/capsule.service.js";
import { logger } from "../utils/logger.js";

export const createCapsuleController = asyncHandler(async (req, res) => {
  const { body, file } = req;

  const capsule = await createCapsule(body, file);

  return res.status(201).json({
    status: "success",
    message: "Capsule created successfully",
    data: capsule,
  });
});
