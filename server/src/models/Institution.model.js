// models/Institution.js
import mongoose from "mongoose";
import argon2 from "argon2";
import { logger } from "../utils/logger.js";

const institutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    codename: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["School", "College", "Academy", "Coaching Center", "others"],
      required: true,
    },
    role: { type: String, default: "admin" },
    password: String,
    avatar: {
      url: String,
      publicId: String,
    },

    address: String,

    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: "" },
    verificationTokenExpiresAt: {
      type: Date,
      default: () => Date.now() + 10 * 60 * 1000,
    },
    resetPasswordToken: { type: String, default: "" },
    resetPasswordExpiresAt: {
      type: Date,
      default: () => Date.now() + 60 * 60 * 1000,
    },

    googleId: { type: String },
    instructors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
  },
  { timestamps: true }
);

// 🔐 Hash password before saving
institutionSchema.pre("save", async function (next) {
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
institutionSchema.methods.comparePassword = async function (userPassword) {
  return argon2.verify(this.password, userPassword);
};

// 🌐 Virtual profile URL
institutionSchema.virtual("profileUrl").get(function () {
  return `/institutions/${this.codename}`;
});

export const Institution = mongoose.model("Institution", institutionSchema);
