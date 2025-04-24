// models/enrollment.model.js
import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    course_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    },
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    completionStatus: {
        type: String,
        enum: ["not-started", "in-progress", "completed"],
        default: "not-started"
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    completedLectures: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lecture"
    }],
    totalTimeSpent: {
        type: Number,
        default: 0
    },
    weeklyTimeSpent: {
        type: Number,
        default: 0
    },
    certificateIssued: {
        type: Boolean,
        default: false
    },
    certificateUrl: String,
    notes: [{
        lectureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lecture"
        },
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    quizScores: [{
        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quiz"
        },
        score: Number,
        maxScore: Number,
        passStatus: Boolean,
        attemptedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

// Create a compound index for user_id and course_id to ensure uniqueness
enrollmentSchema.index({ user_id: 1, course_id: 1 }, { unique: true });

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
