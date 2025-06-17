import mongoose from "mongoose";
// models/Quiz.js
const quizSchema = new mongoose.Schema({
  title: String,
  type: { type: String, enum: ["mutation", "boss"], required: true },
  mission: { type: mongoose.Schema.Types.ObjectId, ref: "Mission" },
  level: { type: mongoose.Schema.Types.ObjectId, ref: "Level" },
  questions: [
    {
      questionText: String,
      options: [String],
      correctAnswerIndex: Number,
    },
  ],
  passingScore: Number,
  durationMinutes: Number,
});

export const Quiz = mongoose.model("Quiz", quizSchema);
