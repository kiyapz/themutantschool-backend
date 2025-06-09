import mongoose from "mongoose";

const usernameSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      maxLength: [50, "Username should not exceed 50 characters"],
      minLength: [4, "Username should be at least 4 characters"],
      trim: true,
      required: [true, "Username is required"],
    },
  },
  { timestamps: true }
);

export const UserName = mongoose.model("UserName", usernameSchema);
