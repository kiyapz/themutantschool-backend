import mongoose from "mongoose";

const capsuleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoUrl: {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
  },
  duration: { type: String, required: true },
  level: { type: mongoose.Schema.Types.ObjectId, ref: "Level", required: true },
  order: { type: Number, required: true },
});

export const Capsule = mongoose.model("Capsule", capsuleSchema);
