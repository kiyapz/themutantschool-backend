import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, 'userName is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'email is required'],
        unique: true,
        trim: true,
        lowercase: true
    },
    // Remove password, verification, tokens, etc.
    role: {
        type: String,
        default: "USER"
    },
    purchasedCourses: [{
        type: String,
    }],
    profileImage: {
        public_id: {
            type: String
        },
        secure_url: {
            type: String
        }
    },
    createdAt: {
        type: Date,
        select: false
    },
    updatedAt: {
        type: Date,
        select: false
    },
    __v: {
        type: Number,
        select: false
    }
}, {
    timestamps: true,
});

const User = mongoose.model("User", userSchema);
export default User;