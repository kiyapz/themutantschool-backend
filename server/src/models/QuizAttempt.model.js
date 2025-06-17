import mongoose, { mongo } from "mongoose";

// models/QuizAttempt.js
const quizAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  score: Number,
  passed: Boolean,
  submittedAt: { type: Date, default: Date.now },
});
export const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);
