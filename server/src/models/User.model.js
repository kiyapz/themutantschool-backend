// models/User.js
import mongoose from "mongoose";
import argon2 from "argon2";
import { logger } from "../utils/logger.js";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    username: { type: String, trim: true },

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
      default: "student",
      required: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: "",
    },
    verificationTokenExpiresAt: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: {
      type: String,
      default: "",
    },
    resetPasswordExpiresAt: {
      type: Date,
      default: Date.now,
    },
    googleId: { type: String },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution" },
    profile: {
      avatar: {
        url: String,
        publicId: String,
      },
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
