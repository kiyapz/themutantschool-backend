// controllers/quizAttempt.controller.js
import { submitQuizAttempt } from "../services/submitQuizAttempt .service.js";
import { asyncHandler } from "../middlewares/ayncHandler.js";

export const submitQuizAttemptController = asyncHandler(async (req, res) => {
  const { quizId, userId, answers } = req.body;

  const result = await submitQuizAttempt({ quizId, userId, answers });

  return res.status(200).json({
    status: "success",
    message: result.passed ? "You passed the quiz!" : "You failed the quiz.",
    data: result,
  });
});
