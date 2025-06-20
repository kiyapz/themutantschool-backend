import { createCourse } from "../services/mission.service.js";
import { logger } from "../utils/logger.js";

export const createCourseController = async (req, res) => {
  try {
    const { body, file } = req;

    const course = await createCourse(body, file);

    return res.status(201).json({
      status: "success",
      message: "Course created successfully",
      data: course,
    });
  } catch (error) {
    logger.error(`❌ Failed to create course: ${error.message}`);

    return res.status(400).json({
      status: "error",
      message: error.message || "Something went wrong",
    });
  }
};
