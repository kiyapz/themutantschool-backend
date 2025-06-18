import mongoose from "mongoose";
import argon2 from "argon2";
import { logger } from "../utils/logger.js";
// models/Affiliate.js
const affiliateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  referralCode: { type: String, unique: true },
  earnings: { type: Number, default: 0 },
  referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

// 🔐 Hash password before saving
affiliateSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      this.password = await argon2.hash(this.password);
    } catch (error) {
      logger.warn(error);
      return next(error);
    }
  }
  next();
});

// 🔐 Compare password
affiliateSchema.methods.comparePassword = async function (userPassword) {
  return argon2.verify(this.password, userPassword);
};

export const Affiliate = mongoose.model("Affiliate", affiliateSchema);
