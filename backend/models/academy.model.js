import mongoose from "mongoose";

const academySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    institutionName: { type: String, required: true },
    location: { type: String, required: true },
    academyAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
    instructors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Instructor" }],
    coursesOffered: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    registrationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export const Academy = mongoose.model("Academy", academySchema);

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

export const AcademyModel = mongoose.model("AcademyModel", academySchema);
