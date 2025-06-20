// controllers/quiz.controller.js
import { createQuiz } from "../services/quiz.service.js";
import { asyncHandler } from "../middlewares/ayncHandler.js";
export const createQuizController = asyncHandler(async (req, res) => {
  const quiz = await createQuiz(req.body);

  return res.status(201).json({
    status: "success",
    message: "Quiz created successfully",
    data: quiz,
  });
});
