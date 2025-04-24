// controllers/analytics.controller.js
import mongoose from "mongoose";
import Course from "../models/course.model.js";
import User from "../models/user.model.js";
import Enrollment from "../models/enrollment.model.js"; // You'll need to create this model
import apiResponse from "../utils/apiResponse.js";
import tryCatch from "../utils/trycatch.js";

const getUserDashboardStats = tryCatch(async (req, res) => {
    const userId = req.params.user_id || req.query.user_id || "64b7f9f2e1b1c2a3d4e5f6a8";
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return apiError(400, "Invalid user ID");
    }
    
    // Get enrolled courses
    const enrollments = await Enrollment.find({ user_id: userId });
    const enrolledCourseIds = enrollments.map(e => e.course_id);
    
    // Get course completion stats
    const completionStats = await Enrollment.aggregate([
        { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
        { $group: {
            _id: null,
            totalCourses: { $sum: 1 },
            completedCourses: { 
                $sum: { $cond: [{ $eq: ["$completionStatus", "completed"] }, 1, 0] }
            },
            inProgressCourses: { 
                $sum: { $cond: [{ $eq: ["$completionStatus", "in-progress"] }, 1, 0] }
            }
        }}
    ]);
    
    // Get recent activity
    const recentActivity = await Enrollment.find({ user_id: userId })
        .sort({ lastAccessedAt: -1 })
        .limit(5)
        .populate('course_id', 'title thumbnail');
    
    // Get learning time stats
    const timeStats = {
        totalLearningTime: enrollments.reduce((sum, e) => sum + (e.totalTimeSpent || 0), 0),
        weeklyLearningTime: 0, // You would calculate this based on logs
        dailyAverage: 0 // You would calculate this based on logs
    };
    
    // Calculate weekly learning time
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyStats = await Enrollment.aggregate([
        { 
            $match: { 
                user_id: new mongoose.Types.ObjectId(userId),
                lastAccessedAt: { $gte: oneWeekAgo }
            } 
        },
        { $group: {
            _id: null,
            weeklyTime: { $sum: "$weeklyTimeSpent" }
        }}
    ]);
    
    if (weeklyStats.length > 0) {
        timeStats.weeklyLearningTime = weeklyStats[0].weeklyTime;
        timeStats.dailyAverage = timeStats.weeklyLearningTime / 7;
    }
    
    // Get achievement stats
    const achievements = {
        certificatesEarned: 0,
        coursesCompleted: completionStats.length > 0 ? completionStats[0].completedCourses : 0,
        quizzesPassed: 0 // You would calculate this based on quiz records
    };
    
    res.status(200).json(
        new apiResponse("Dashboard statistics fetched successfully", {
            enrollmentStats: completionStats.length > 0 ? completionStats[0] : { totalCourses: 0, completedCourses: 0, inProgressCourses: 0 },
            timeStats,
            recentActivity,
            achievements
        })
    );
});

export { getUserDashboardStats };
