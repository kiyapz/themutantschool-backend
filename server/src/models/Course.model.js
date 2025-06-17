// models/Mission.js
import mongoose from "mongoose";
const missionSchema = new mongoose.Schema({
  title: String,
  description: String,
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution" },
  levels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Level" }],
  thumbnail: String,
  category: String,
  certificateAvailable: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Mission = mongoose.model("Mission", missionSchema);
