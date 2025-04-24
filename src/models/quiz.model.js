// models/quiz.model.js
import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    course_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    section_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section"
    },
    instructor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Instructor",
        required: true
    },
    timeLimit: {
        type: Number, // in minutes
        default: 30
    },
    passingScore: {
        type: Number,
        default: 70
    },
    questions: [{
        questionText: {
            type: String,
            required: true
        },
        questionType: {
            type: String,
            enum: ["multiple-choice", "true-false", "short-answer"],
            default: "multiple-choice"
        },
        options: [{
            text: String,
            isCorrect: Boolean
        }],
        correctAnswer: String, // For short-answer questions
        points: {
            type: Number,
            default: 1
        }
    }],
    isPublished: {
        type: Boolean,
        default: false
    },
    allowRetake: {
        type: Boolean,
        default: true
    },
    maxAttempts: {
        type: Number,
        default: 3
    },
    showAnswers: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Quiz = mongoose.model("Quiz", quizSchema);

export default Quiz;
