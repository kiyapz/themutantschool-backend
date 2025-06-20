import { createLevel as createLevelService } from "../services/level.service.js";
import { asyncHandler } from "../middlewares/ayncHandler.js";

export const createLevelController = asyncHandler(async (req, res) => {
  const { body } = req;
  const level = await createLevelService(body);
  return res.status(201).json({
    status: "success",
    message: "Level created successfully",
    data: level,
  });
});
