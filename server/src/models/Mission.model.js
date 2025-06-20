// models/Mission.js
import mongoose from "mongoose";
const missionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true },

  instructor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution" },
  levels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Level" }],
  thumbnail: {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
  },
  certificateAvailable: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Mission = mongoose.model("Mission", missionSchema);
