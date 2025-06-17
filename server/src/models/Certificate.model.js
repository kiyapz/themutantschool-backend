import mongoose from "mongoose";
// models/Certificate.js
const certificateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  mission: { type: mongoose.Schema.Types.ObjectId, ref: "Mission" },
  issuedAt: { type: Date, default: Date.now },
  certificateUrl: String,
});

export const Certificate = mongoose.model("Certificate");
