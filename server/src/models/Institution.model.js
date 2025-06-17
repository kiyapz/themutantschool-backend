// models/Institution.js
import mongoose from "mongoose";

const institutionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["academy", "training"], required: true },
  email: { type: String, required: true, unique: true },
  password: String,
  logo: String,
  address: String,
  verified: { type: Boolean, default: false },
  instructors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

export const Institution = mongoose.model("Institution", institutionSchema);
