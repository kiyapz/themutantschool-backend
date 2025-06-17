// models/Level.js
import mongoose from "mongoose";
const levelSchema = new mongoose.Schema({
  title: String,
  mission: { type: mongoose.Schema.Types.ObjectId, ref: "Mission" },
  capsules: [{ type: mongoose.Schema.Types.ObjectId, ref: "Capsule" }],
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  order: Number,
});

export const Level = mongoose.model("Level", levelSchema);
