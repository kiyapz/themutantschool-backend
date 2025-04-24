//mangement.controller.js
import mongoose from "mongoose";
import Course from "../models/course.model.js";
import Review from "../models/courseReview.model.js";
import Lecture from "../models/sectionLecture.model.js";
import User from "../models/user.model.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import tryCatch from "../utils/tryCatch.js";
import { logger } from "../utils/logger.js";

/**
 * Get all courses for review
 * @route GET /manage/courses
 * @access Admin only
 */
const getCourses = tryCatch(async (req, res) => {
    // Implement pagination for better performance with large datasets
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Add filtering options
    const filter = {};
    if (req.query.approved === 'true') filter.approved = true;
    if (req.query.approved === 'false') filter.approved = false;
    if (req.query.reviewed === 'true') filter.reviewed = true;
    if (req.query.reviewed === 'false') filter.reviewed = false;
    
    const courses = await Review.find(filter)
        .populate('course_id', 'title category price')
        .populate('reviewedBy', 'username email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    
    const total = await Review.countDocuments(filter);
    
    if (!courses) {
        throw new apiError(500, "Error occurred when fetching courses");
    }
    
    res.status(200).json(
        new apiResponse("Courses fetched successfully", {
            courses,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        })
    );
});

/**
 * Get course detail by ID
 * @route GET /manage/courses/:course_id
 * @access Admin only
 */
const courseDetail = tryCatch(async (req, res) => {
    const { course_id } = req.params;
    
    // ObjectId validation is now handled by middleware
    
    const course = await Course.findById(course_id)
        .populate({
            path: 'instructor_id',
            select: 'username email profileCompleted'
        })
        .populate({
            path: 'sections',
            populate: {
                path: 'lectures',
                model: 'Lecture'
            }
        });
    
    if (!course) {
        throw new apiError(404, "Course not found");
    }
    
    // Get review information if it exists
    const review = await Review.findOne({ course_id });
    
    res.status(200).json(
        new apiResponse("Course detail fetched successfully", {
            course,
            review
        })
    );
});

/**
 * Review a lecture
 * @route POST /manage/lectures/:lecture_id/review
 * @access Admin only
 */
const reviewLecture = tryCatch(async (req, res) => {
    const { lecture_id } = req.params;
    const { flag, feedback } = req.body;
    
    // Validate required fields
    if (flag === undefined) {
        throw new apiError(400, "Approval flag is required");
    }
    
    // If not approved, feedback is required
    if (flag === false && (!feedback || feedback.trim() === "")) {
        throw new apiError(400, "Feedback is required when rejecting a lecture");
    }
    
    // Set feedback based on flag
    const feed = !flag ? feedback : "";
    
    const lecture = await Lecture.findByIdAndUpdate(
        lecture_id,
        {
            approved: flag,
            feedback: feed,
            reviewedAt: new Date(),
            reviewedBy: req.user._id
        },
        { new: true }
    );
    
    if (!lecture) {
        throw new apiError(404, "Lecture not found");
    }
    
    // Log the review action
    logger.info(`Lecture ${lecture_id} reviewed by ${req.user.email}: ${flag ? 'Approved' : 'Rejected'}`);
    
    res.status(200).json(
        new apiResponse("Lecture review status updated successfully", lecture)
    );
});

/**
 * Review a course
 * @route POST /manage/courses/:course_id/review
 * @access Admin only
 */
const reviewing = tryCatch(async (req, res) => {
    const { course_id } = req.params;
    const { feedback, flag, message } = req.body;
    
    // Validate required fields
    if (flag === undefined) {
        throw new apiError(400, "Approval flag is required");
    }
    
    // If not approved, feedback is required
    if (flag === false && (!feedback || feedback.trim() === "")) {
        throw new apiError(400, "Feedback is required when rejecting a course");
    }
    
    // Prepare update data with proper validation
    const updateData = {
        reviewed: true,
        approved: flag,
        reviewedBy: req.user._id,
        reviewedAt: new Date()
    };
    
    // Only add feedback if provided
    if (feedback) {
        updateData.feedback = feedback;
    }
    
    // Validate and add message data if provided
    if (message) {
        if (message.landing) {
            updateData.landing = {
                flag: message.landing.flag,
                value: message.landing.value
            };
        }
        
        if (message.intended) {
            updateData.intended = {
                flag: message.intended.flag,
                value: message.intended.value
            };
        }
    }
    
    // Update the review document
    const review = await Review.findOneAndUpdate(
        { course_id },
        { $set: updateData },
        { new: true }
    );
    
    if (!review) {
        throw new apiError(404, "Review not found for this course");
    }
    
    // Update the course approval status
    const updatedCourse = await Course.findByIdAndUpdate(
        course_id,
        { 
            approved: flag,
            lastReviewedAt: new Date()
        },
        { new: true }
    );
    
    if (!updatedCourse) {
        throw new apiError(404, "Course not found");
    }
    
    // Log the review action
    logger.info(`Course ${course_id} reviewed by ${req.user.email}: ${flag ? 'Approved' : 'Rejected'}`);
    
    res.status(200).json(
        new apiResponse("Course review status updated successfully", review)
    );
});

/**
 * Change user role
 * @route PATCH /manage/users/role
 * @access Admin only
 */
const changeRole = tryCatch(async (req, res) => {
    const { email, role } = req.body;
    
    // Validate required fields
    if (!email || !role) {
        throw new apiError(400, "Email and role are required");
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new apiError(400, "Invalid email format");
    }
    
    // Validate role
    const validRoles = ['user', 'admin', 'instructor'];
    if (!validRoles.includes(role)) {
        throw new apiError(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
    
    // Find and update the user
    const user = await User.findOneAndUpdate(
        { email },
        { role },
        { new: true }
    );
    
    if (!user) {
        throw new apiError(404, "User not found");
    }
    
    // Log the role change
    logger.info(`User role changed: ${email} is now ${role} (changed by ${req.user.email})`);
    
    res.status(200).json(
        new apiResponse(`User ${email} role changed to ${role}`, {
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        })
    );
});

export {
    getCourses,
    courseDetail,
    reviewing,
    changeRole,
    reviewLecture
};
