// services/quizAttempt.service.js
// import { Quiz } from "../models/Quiz.model.js";
// import { QuizAttempt } from "../models/QuizAttempt.model";
import { Quiz } from "../models/Quiz.model.js";
import { QuizAttempt } from "../models/QuizAttempt.model.js";
export const submitQuizAttempt = async ({ quizId, userId, answers }) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new Error("Quiz not found");

  const correctAnswers = quiz.questions.map((q) => q.correctAnswerIndex);

  let score = 0;
  for (let i = 0; i < answers.length; i++) {
    if (answers[i] === correctAnswers[i]) score++;
  }

  const percentage = (score / quiz.questions.length) * 100;
  const passed = percentage >= quiz.passingScore;

  const attempt = await QuizAttempt.create({
    user: userId,
    quiz: quizId,
    score: percentage,
    passed,
  });

  return { passed, score: percentage, attemptId: attempt._id };
};
