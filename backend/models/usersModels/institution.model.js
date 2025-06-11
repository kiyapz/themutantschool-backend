import mongoose from "mongoose";
import { logger } from "../../utils/logger.js";
import argon2 from "argon2";

const institutionSchema = new mongoose.Schema(
  {
    username: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserName",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      unique: true,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    institutionType: {
      type: String,
      enum: ["School", "College", "Academy", "Coaching Center", "others"],
      default: "others",
    },
    phone: String,
    avatar: {
      url: String,
      publicId: String,
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
  },
  { timestamps: true }
);
// Hash password before saving
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

// Password comparison method
institutionSchema.methods.comparePassword = async function (userPassword) {
  try {
    return await argon2.verify(this.password, userPassword);
  } catch (error) {
    throw error;
  }
};

institutionSchema.index({ email: "text" });

export const Institution = mongoose.model("Institution", institutionSchema);
