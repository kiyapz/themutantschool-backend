// models/Capsule.js
import mongoose from "mongoose";
const capsuleSchema = new mongoose.Schema({
  title: String,
  videoUrl: String,
  duration: String,
  level: { type: mongoose.Schema.Types.ObjectId, ref: "Level" },
  order: Number,
});

export const Capsule = mongoose.model("Capsule", capsuleSchema);
