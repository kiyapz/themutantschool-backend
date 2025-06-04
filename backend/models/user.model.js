import mongoose from "mongoose";
import argon2 from "argon2";
import { logger } from "../utils/logger.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    username: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "instructor", "student", "affiliate"],
      default: "student", // Fixed typo
    },
    avatar: {
      url: {
        type: String,
      },
      publicId: {
        type: String,
      },
    },
    verificationToken: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
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
  },
  { timestamps: true }
);

// Hash password before saving
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

// Password comparison method
userSchema.methods.comparePassword = async function (userPassword) {
  try {
    return await argon2.verify(this.password, userPassword);
  } catch (error) {
    throw error;
  }
};

userSchema.index({ email: "text" });

export const User = mongoose.model("User", userSchema);
