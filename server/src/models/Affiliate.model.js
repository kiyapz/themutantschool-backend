import mongoose from "mongoose";
// models/Affiliate.js
const affiliateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  referralCode: { type: String, unique: true },
  earnings: { type: Number, default: 0 },
  referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

export const Affiliate = mongoose.model("Affiliate", affiliateSchema);
