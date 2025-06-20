// services/quiz.service.js

import { Quiz } from "../models/Quiz.model.js";
import { Level } from "../models/Level.model.js";
import { Mission } from "../models/Mission.model.js";
import { logger } from "../utils/logger.js";
export const createQuiz = async (body) => {
  const {
    title,
    type,
    missionId,
    levelId,
    questions,
    passingScore,
    durationMinutes,
  } = body;

  if (
    !title ||
    !type ||
    !missionId ||
    !levelId ||
    !questions ||
    !passingScore ||
    !durationMinutes
  ) {
    throw new Error("Missing required fields for quiz.");
  }

  const quiz = new Quiz({
    title,
    type,
    mission: missionId,
    level: levelId,
    questions,
    passingScore,
    durationMinutes,
  });

  const savedQuiz = await quiz.save();

  // Optional: Attach quiz to level
  await Level.findByIdAndUpdate(levelId, { quiz: savedQuiz._id });

  logger.info(`✅ Quiz created with ID: ${savedQuiz._id}`);
  return savedQuiz;
};
