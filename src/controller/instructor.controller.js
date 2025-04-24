// controller/instructor.controller.js
import mongoose from "mongoose";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import tryCatch from "../utils/trycatch.js";
import Instructor from "../models/instructor.model.js";
import User from "../models/user.model.js";
import Course from "../models/course.model.js";
import { logger } from "../utils/logger.js";

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Creates a new instructor profile for a user
 * @route POST /api/v1/instructor/create/:user_id?
 */
const createInstructor = tryCatch(async (req, res) => {
    // Get user ID from request or use default for testing
    let user_id = req.params.user_id || req.body.user_id || "64b7f9f2e1b1c2a3d4e5f6a8";
    
    // Validate user ID
    if (!isValidObjectId(user_id)) {
        return apiError(400, "Invalid user ID format");
    }

    // Find or create user
    let user = await User.findById(user_id);
    
    if (!user) {
        try {
            user = await User.create({
                _id: new mongoose.Types.ObjectId(user_id),
                username: "demoInstructor",
                email: "demo@demo.com"
            });
            logger.info(`Created new user with ID: ${user_id}`);
        } catch (error) {
            logger.error(`Failed to create user: ${error.message}`);
            return apiError(500, "Failed to create user");
        }
    }

    // Check if instructor profile already exists
    const existingInstructor = await Instructor.findOne({ user_id: user._id });
    
    if (existingInstructor) {
        return apiError(409, "Instructor profile already exists for this user");
    }

    // Create instructor profile
    let instructor;
    try {
        instructor = await Instructor.create({
            user_id: user._id,
            bio: req.body.bio || "",
            headline: req.body.headline || "",
            profileCompleted: {
                status: false,
                step: 1
            }
        });
        logger.info(`Created instructor profile for user: ${user_id}`);
    } catch (error) {
        logger.error(`Failed to create instructor: ${error.message}`);
        return apiError(500, "Failed to create instructor profile");
    }

    if (!instructor) {
        return apiError(500, "Failed to create instructor profile");
    }

    // Update user role
    try {
        user = await User.findByIdAndUpdate(
            user._id,
            { $set: { role: "INSTRUCTOR" } },
            { new: true }
        ).select("-forgotPasswordToken -password");
    } catch (error) {
        // Rollback instructor creation if user update fails
        await Instructor.findByIdAndDelete(instructor._id);
        logger.error(`Failed to update user role: ${error.message}`);
        return apiError(500, "Failed to update user role");
    }

    if (!user) {
        // Rollback instructor creation if user not found
        await Instructor.findByIdAndDelete(instructor._id);
        return apiError(404, "User not found after instructor creation");
    }

    // Format response
    instructor = instructor.toObject();
    instructor.user_id = user;

    res.status(201).json(
        new apiResponse("Successfully set user as instructor", instructor)
    );
});

/**
 * Gets instructor details including courses
 * @route GET /api/v1/instructor/instructorDetails/:user_id?
 */
const getInstructorDetails = tryCatch(async (req, res) => {
    // Get user ID from request or use default for testing
    let user_id = req.params.user_id || req.query.user_id || req.body.user_id || "64b7f9f2e1b1c2a3d4e5f6a8";
    
    // Validate user ID
    if (!isValidObjectId(user_id)) {
        return apiError(400, "Invalid user ID format");
    }

    // Find user
    let user = await User.findById(user_id).select("-forgotPasswordToken -password");
    
    if (!user) {
        logger.warn(`User not found with ID: ${user_id}`);
        // For demo/testing purposes, create a mock user object
        if (process.env.NODE_ENV === 'development') {
            user = { 
                _id: new mongoose.Types.ObjectId(user_id), 
                username: "demoInstructor",
                email: "demo@demo.com",
                role: "INSTRUCTOR"
            };
        } else {
            return apiError(404, "User not found");
        }
    }

    // Find instructor profile
    let instructor = await Instructor.findOne({ user_id: user._id });
    
    if (!instructor) {
        return apiError(404, "Instructor profile not found");
    }

    // Get instructor's courses with reviews
    let courses = [];
    try {
        courses = await Course.aggregate([
            {
                $match: {
                    instructor_id: instructor._id
                }
            },
            {
                $lookup: {
                    from: "reviews",
                    localField: "_id",
                    foreignField: "course_id",
                    as: "review"
                }
            },
            {
                $unwind: {
                    path: "$review",
                    preserveNullAndEmptyArrays: true 
                }
            },
            {
                $project: {
                    "instructor_id": 0,
                    "__v": 0,
                    "courses.reviews.__v": 0,
                    "courses.reviews.reviewedBy": 0,
                    "courses.reviews.landing": 0,
                    "courses.reviews.intended": 0,
                    "courses.reviews.feeback": 0,
                    "courses.reviews._id": 0,
                    "__v": 0,
                    "user_id": 0
                }
            },
            {
                $sort: { "createdAt": -1 }
            }
        ]);
    } catch (error) {
        logger.error(`Failed to fetch instructor courses: ${error.message}`);
        // Continue execution even if courses fetch fails
        courses = [];
    }

    // Calculate statistics
    const totalCourses = courses.length;
    const totalStudents = courses.reduce((sum, course) => sum + (course.enrollmentCount || 0), 0);
    const totalRevenue = courses.reduce((sum, course) => sum + ((course.price || 0) * (course.enrollmentCount || 0)), 0);
    const averageRating = totalCourses > 0 
        ? courses.reduce((sum, course) => sum + (course.rating || 0), 0) / totalCourses 
        : 0;

    // Format response
    instructor = instructor.toObject();
    instructor.courses = courses;
    instructor.statistics = {
        totalCourses,
        totalStudents,
        totalRevenue,
        averageRating
    };

    // Ensure user is a plain object
    user = typeof user.toObject === 'function' ? user.toObject() : { ...user };
    delete user.forgotPasswordToken;
    delete user.password;
    
    // Add instructor data to user object
    user.instructor = instructor;

    res.status(200).json(
        new apiResponse("Instructor details fetched successfully", user)
    );
});

/**
 * Updates instructor profile details
 * @route PATCH /api/v1/instructor/details/:instructor_id?
 */
const updateInstructorDetails = tryCatch(async (req, res) => {
    // Get instructor ID from request
    const instructor_id = req.params.instructor_id || req.body.instructor_id;
    
    // Validate instructor ID
    if (!instructor_id || !isValidObjectId(instructor_id)) {
        return apiError(400, "Invalid instructor ID format");
    }

    const { bio, headline, socialLinks, expertise, education, experience } = req.body;

    // Build update object with provided fields
    const updateFields = {};
    if (bio !== undefined) updateFields.bio = bio;
    if (headline !== undefined) updateFields.headline = headline;
    if (socialLinks !== undefined) updateFields.socialLinks = socialLinks;
    if (expertise !== undefined) updateFields.expertise = expertise;
    if (education !== undefined) updateFields.education = education;
    if (experience !== undefined) updateFields.experience = experience;

    // If nothing to update, return early
    if (Object.keys(updateFields).length === 0) {
        return res.status(200).json(new apiResponse("Nothing to update"));
    }

    // Update instructor profile
    const instructor = await Instructor.findOneAndUpdate(
        { _id: instructor_id },
        { $set: updateFields },
        { new: true, runValidators: true }
    );

    if (!instructor) {
        return apiError(404, "Instructor profile not found");
    }

    // Update profile completion status if needed
    let profileUpdated = false;
    if (!instructor.profileCompleted.status) {
        // Check if profile is now complete
        const isComplete = Boolean(
            instructor.bio && 
            instructor.headline && 
            (instructor.expertise && instructor.expertise.length > 0)
        );
        
        if (isComplete) {
            instructor.profileCompleted.status = true;
            instructor.profileCompleted.completedAt = new Date();
            profileUpdated = true;
        } else {
            instructor.profileCompleted.step = Math.max(instructor.profileCompleted.step || 0, 2);
            profileUpdated = true;
        }
        
        if (profileUpdated) {
            await instructor.save();
        }
    }

    res.status(200).json(
        new apiResponse(
            profileUpdated 
                ? "Profile updated and completion status changed" 
                : "Profile updated successfully",
            instructor
        )
    );
});

/**
 * Gets instructor analytics and performance metrics
 * @route GET /api/v1/instructor/:instructor_id/analytics
 */
const getInstructorAnalytics = tryCatch(async (req, res) => {
    const { instructor_id } = req.params;
    
    if (!instructor_id || !isValidObjectId(instructor_id)) {
        return apiError(400, "Invalid instructor ID format");
    }
    
    const instructor = await Instructor.findById(instructor_id);
    
    if (!instructor) {
        return apiError(404, "Instructor profile not found");
    }
    
    // Get all courses by this instructor
    const courses = await Course.find({ instructor_id: instructor._id });
    
    if (!courses.length) {
        return res.status(200).json(
            new apiResponse("No courses found for analytics", {
                earnings: 0,
                students: 0,
                coursesCount: 0,
                averageRating: 0,
                coursePerformance: []
            })
        );
    }
    
    // Calculate analytics
    const totalEarnings = courses.reduce((sum, course) => 
        sum + ((course.price || 0) * (course.enrollmentCount || 0)), 0);
    
    const totalStudents = courses.reduce((sum, course) => 
        sum + (course.enrollmentCount || 0), 0);
    
    const averageRating = courses.reduce((sum, course) => 
        sum + (course.rating || 0), 0) / courses.length;
    
    // Get performance data for each course
    const coursePerformance = courses.map(course => ({
        courseId: course._id,
        title: course.title,
        students: course.enrollmentCount || 0,
        earnings: (course.price || 0) * (course.enrollmentCount || 0),
        rating: course.rating || 0,
        createdAt: course.createdAt
    }));
    
    res.status(200).json(
        new apiResponse("Instructor analytics fetched successfully", {
            earnings: totalEarnings,
            students: totalStudents,
            coursesCount: courses.length,
            averageRating,
            coursePerformance
        })
    );
});

export {
    createInstructor,
    getInstructorDetails,
    updateInstructorDetails,
    getInstructorAnalytics
};
