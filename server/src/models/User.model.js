// models/User.js
import mongoose from "mongoose";
import argon2 from "argon2"; // ✅ Import argon2
import logger from "../utils/logger.js"; // ✅ Replace with your actual logger or console

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String },
    role: {
      type: String,
      enum: ["student", "instructor", "affiliate", "admin"],
      required: true,
      index: true, // ✅ Also index role here
    },
    isEmailVerified: { type: Boolean, default: false },
    googleId: { type: String },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution" },
    profile: {
      avatar: String,
      bio: String,
      socialLinks: {
        website: String,
        twitter: String,
        linkedin: String,
      },
    },
    referralCode: { type: String, index: true },
  },
  {
    timestamps: true,
  }
);

// 🔐 Hash password before saving
userSchema.pre("save", async function (next) {
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
userSchema.methods.comparePassword = async function (userPassword) {
  return argon2.verify(this.password, userPassword);
};

// 📦 Export model
export const User = mongoose.model("User", userSchema);
