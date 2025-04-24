// models/discussion.model.js
import mongoose from "mongoose";

const discussionSchema = new mongoose.Schema({
    course_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    section_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section"
    },
    lecture_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lecture"
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    author_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    isAnnouncement: {
        type: Boolean,
        default: false
    },
    replies: [{
        content: {
            type: String,
            required: true
        },
        author_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        isInstructorResponse: {
            type: Boolean,
            default: false
        },
        upvotes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }]
    }],
    tags: [String],
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    views: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Discussion = mongoose.model("Discussion", discussionSchema);

export default Discussion;
