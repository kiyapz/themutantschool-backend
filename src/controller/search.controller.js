// controllers/search.controller.js
import mongoose from "mongoose";
import Course from "../models/course.model.js";
import User from "../models/user.model.js";
import Enrollment from "../models/enrollment.model.js";
import tryCatch from "../utils/tryCatch.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";

/**
 * Helper to inject mock user for development/testing
 * @param {Object} req - Express request object
 */
function injectMockUser(req) {
    if (!req.user) {
        req.user = { 
            _id: new mongoose.Types.ObjectId("64b7f9f2e1b1c2a3d4e5f6a8"), 
            username: "demoUser" 
        };
    }
}

/**
 * Search courses based on query parameters
 * @route GET /api/search
 */
const searchCourses = tryCatch(async (req, res) => {
    injectMockUser(req);
    
    const { 
        query = "", 
        category = "", 
        level = "",
        price = "",
        rating = "",
        sortBy = "relevance",
        page = 1,
        limit = 10
    } = req.query;
    
    // Build search filter
    const filter = { approved: true };
    
    // Text search if query provided
    if (query) {
        filter.$or = [
            { title: { $regex: query, $options: 'i' } },
            { subtitle: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { "goals.objectives": { $regex: query, $options: 'i' } },
            { "goals.intended_learners": { $regex: query, $options: 'i' } },
            { tags: { $regex: query, $options: 'i' } }
        ];
    }
    
    // Apply category filter
    if (category) {
        filter.category = category;
    }
    
    // Apply level filter
    if (level) {
        filter.level = level;
    }
    
    // Apply price filter
    if (price) {
        if (price === "free") {
            filter.price = 0;
        } else if (price === "paid") {
            filter.price = { $gt: 0 };
        } else if (price.includes("-")) {
            const [min, max] = price.split("-").map(Number);
            filter.price = { $gte: min, $lte: max };
        }
    }
    
    // Apply rating filter
    if (rating) {
        filter.rating = { $gte: parseFloat(rating) };
    }
    
    // Determine sort order
    let sortOptions = {};
    
    switch (sortBy) {
        case "newest":
            sortOptions = { createdAt: -1 };
            break;
        case "oldest":
            sortOptions = { createdAt: 1 };
            break;
        case "price-high-low":
            sortOptions = { price: -1 };
            break;
        case "price-low-high":
            sortOptions = { price: 1 };
            break;
        case "rating":
            sortOptions = { rating: -1 };
            break;
        case "popularity":
            sortOptions = { enrollmentCount: -1 };
            break;
        case "relevance":
        default:
            // For relevance, we'll use text score if query exists, otherwise newest
            if (query) {
                sortOptions = { score: { $meta: "textScore" } };
            } else {
                sortOptions = { createdAt: -1 };
            }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    let coursesQuery = Course.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('instructor_id', 'username');
    
    // Add text score projection if searching by query
    if (query && sortBy === "relevance") {
        coursesQuery = coursesQuery.select({ score: { $meta: "textScore" } });
    }
    
    const courses = await coursesQuery;
    
    // Get total count for pagination
    const total = await Course.countDocuments(filter);
    
    // Track search query for analytics (could be implemented)
    // await SearchAnalytics.create({ query, user: req.user._id, results: courses.length });
    
    res.status(200).json(
        new apiResponse("Courses fetched successfully", {
            courses,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
            },
            filters: {
                query,
                category,
                level,
                price,
                rating,
                sortBy
            }
        })
    );
});

/**
 * Get search term suggestions based on partial input
 * @route GET /api/search/term-suggestions
 */
const getSearchSuggestions = tryCatch(async (req, res) => {
    const { term = "" } = req.query;
    
    if (!term || term.length < 2) {
        return res.status(200).json(
            new apiResponse("Search term too short", { suggestions: [] })
        );
    }
    
    // Aggregate popular search terms that match the partial input
    const suggestions = await Course.aggregate([
        {
            $match: {
                approved: true,
                $or: [
                    { title: { $regex: term, $options: 'i' } },
                    { tags: { $regex: term, $options: 'i' } },
                    { category: { $regex: term, $options: 'i' } }
                ]
            }
        },
        {
            $project: {
                title: 1,
                tags: 1,
                category: 1
            }
        },
        {
            $unwind: {
                path: "$tags",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: null,
                titles: { $addToSet: "$title" },
                tags: { $addToSet: "$tags" },
                categories: { $addToSet: "$category" }
            }
        },
        {
            $project: {
                _id: 0,
                suggestions: {
                    $concatArrays: ["$titles", "$tags", "$categories"]
                }
            }
        }
    ]);
    
    // Filter suggestions to match the term and limit results
    let allSuggestions = [];
    
    if (suggestions.length > 0) {
        allSuggestions = suggestions[0].suggestions
            .filter(suggestion => suggestion && suggestion.toLowerCase().includes(term.toLowerCase()))
            .slice(0, 10);
    }
    
    // Get popular course titles as additional suggestions
    const popularCourses = await Course.find({ approved: true })
        .sort({ enrollmentCount: -1 })
        .limit(5)
        .select('title');
    
    const popularTitles = popularCourses.map(course => course.title);
    
    // Combine and deduplicate suggestions
    const combinedSuggestions = [...new Set([...allSuggestions, ...popularTitles])].slice(0, 10);
    
    res.status(200).json(
        new apiResponse("Search suggestions fetched successfully", {
            suggestions: combinedSuggestions
        })
    );
});

/**
 * Get collaborative filtering recommendations based on user behavior
 * @route GET /api/search/CollaborativeRecommendations
 */
const getCollaborativeRecommendations = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    
    // Get user's enrolled courses
    const userEnrollments = await Enrollment.find({ user_id: user._id });
    const userCourseIds = userEnrollments.map(enrollment => enrollment.course_id);
    
    // Find similar users (users who have enrolled in at least one of the same courses)
    const similarUsers = await Enrollment.aggregate([
        {
            $match: {
                course_id: { $in: userCourseIds },
                user_id: { $ne: user._id }
            }
        },
        {
            $group: {
                _id: "$user_id",
                commonCourses: { $sum: 1 }
            }
        },
        {
            $sort: { commonCourses: -1 }
        },
        {
            $limit: 50 // Top 50 similar users
        }
    ]);
    
    if (similarUsers.length === 0) {
        // If no similar users found, return popular courses instead
        const popularCourses = await Course.find({ approved: true })
            .sort({ enrollmentCount: -1 })
            .limit(10)
            .populate('instructor_id', 'username');
        
        return res.status(200).json(
            new apiResponse("Popular recommendations fetched successfully", {
                courses: popularCourses,
                recommendationType: "popular"
            })
        );
    }
    
    // Get courses that similar users have enrolled in but the current user hasn't
    const similarUserIds = similarUsers.map(user => user._id);
    
    const recommendedCourses = await Enrollment.aggregate([
        {
            $match: {
                user_id: { $in: similarUserIds },
                course_id: { $nin: userCourseIds }
            }
        },
        {
            $group: {
                _id: "$course_id",
                enrollmentCount: { $sum: 1 }
            }
        },
        {
            $sort: { enrollmentCount: -1 }
        },
        {
            $limit: 10
        }
    ]);
    
    // Fetch full course details
    const courseIds = recommendedCourses.map(course => course._id);
    
    const courses = await Course.find({ 
        _id: { $in: courseIds },
        approved: true 
    })
    .populate('instructor_id', 'username');
    
    // Sort courses based on the order from the aggregation
    const sortedCourses = courseIds.map(id => 
        courses.find(course => course._id.toString() === id.toString())
    ).filter(Boolean);
    
    res.status(200).json(
        new apiResponse("Collaborative recommendations fetched successfully", {
            courses: sortedCourses,
            recommendationType: "collaborative"
        })
    );
});

/**
 * Get content-based recommendations based on course attributes
 * @route GET /api/search/ContentBasedRecommendations
 */
const getContentBasedRecommendations = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    const { courseId } = req.query;
    
    // If courseId is provided, recommend similar courses to that course
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
        const course = await Course.findById(courseId);
        
        if (!course) {
            throw new apiError(404, "Course not found");
        }
        
        // Find courses with similar attributes
        const similarCourses = await Course.find({
            _id: { $ne: course._id },
            approved: true,
            $or: [
                { category: course.category },
                { level: course.level },
                { tags: { $in: course.tags || [] } }
            ]
        })
        .limit(10)
        .populate('instructor_id', 'username');
        
        return res.status(200).json(
            new apiResponse("Similar course recommendations fetched successfully", {
                courses: similarCourses,
                basedOn: course.title,
                recommendationType: "content-similar"
            })
        );
    }
    
    // Otherwise, recommend based on user's enrolled courses
    const userEnrollments = await Enrollment.find({ user_id: user._id });
    
    if (userEnrollments.length === 0) {
        // If user has no enrollments, return trending courses
        const trendingCourses = await Course.find({ approved: true })
            .sort({ createdAt: -1, enrollmentCount: -1 })
            .limit(10)
            .populate('instructor_id', 'username');
        
        return res.status(200).json(
            new apiResponse("Trending recommendations fetched successfully", {
                courses: trendingCourses,
                recommendationType: "trending"
            })
        );
    }
    
    // Get user's enrolled course details
    const userCourseIds = userEnrollments.map(enrollment => enrollment.course_id);
    const userCourses = await Course.find({ _id: { $in: userCourseIds } });
    
    // Extract features from user's courses
    const userCategories = [...new Set(userCourses.map(course => course.category))];
    const userLevels = [...new Set(userCourses.map(course => course.level))];
    const userTags = [...new Set(userCourses.flatMap(course => course.tags || []))];
    
    // Find courses with similar attributes
    const recommendedCourses = await Course.find({
        _id: { $nin: userCourseIds },
        approved: true,
        $or: [
            { category: { $in: userCategories } },
            { level: { $in: userLevels } },
            { tags: { $in: userTags } }
        ]
    })
    .sort({ rating: -1, enrollmentCount: -1 })
    .limit(10)
    .populate('instructor_id', 'username');
    
    res.status(200).json(
        new apiResponse("Content-based recommendations fetched successfully", {
            courses: recommendedCourses,
            recommendationType: "content-based"
        })
    );
});

/**
 * Get contextual recommendations based on user's current learning context
 * @route GET /api/search/ContextualRecommendations
 */
const getContextualRecommendations = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    
    // Get user's in-progress courses
    const inProgressEnrollments = await Enrollment.find({
        user_id: user._id,
        completionStatus: "in-progress"
    }).sort({ lastAccessedAt: -1 });
    
    if (inProgressEnrollments.length === 0) {
        // If no in-progress courses, return new courses
        const newCourses = await Course.find({ approved: true })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('instructor_id', 'username');
        
        return res.status(200).json(
            new apiResponse("New course recommendations fetched successfully", {
                courses: newCourses,
                recommendationType: "new"
            })
        );
    }
    
    // Get the most recently accessed course
    const recentCourseId = inProgressEnrollments[0].course_id;
    const recentCourse = await Course.findById(recentCourseId);
    
    if (!recentCourse) {
        throw new apiError(404, "Recent course not found");
    }
    
    // Find courses that are contextually relevant to the recent course
    const contextualCourses = await Course.find({
        _id: { $ne: recentCourseId },
        approved: true,
        $or: [
            // Same category but next level
            {
                category: recentCourse.category,
                level: getNextLevel(recentCourse.level)
            },
            // Complementary categories with same level
            {
                category: { $in: getComplementaryCategories(recentCourse.category) },
                level: recentCourse.level
            }
        ]
    })
    .limit(10)
    .populate('instructor_id', 'username');
    
    res.status(200).json(
        new apiResponse("Contextual recommendations fetched successfully", {
            courses: contextualCourses,
            currentContext: {
                course: recentCourse.title,
                category: recentCourse.category,
                level: recentCourse.level
            },
            recommendationType: "contextual"
        })
    );
});

/**
 * Get topic-based recommendations focusing on specific learning topics
 * @route GET /api/search/TopicBasedRecommendations
 */
const getTopicBasedRecommendations = tryCatch(async (req, res) => {
    injectMockUser(req);
    const { topic } = req.query;
    
    if (!topic) {
        throw new apiError(400, "Topic parameter is required");
    }
    
    // Find courses related to the specified topic
    const topicCourses = await Course.find({
        approved: true,
        $or: [
            { title: { $regex: topic, $options: 'i' } },
            { category: { $regex: topic, $options: 'i' } },
            { tags: { $regex: topic, $options: 'i' } },
            { "goals.objectives": { $regex: topic, $options: 'i' } }
        ]
    })
    .sort({ rating: -1, enrollmentCount: -1 })
    .limit(10)
    .populate('instructor_id', 'username');
    
    // Group courses by level to create a learning path
    const beginnerCourses = topicCourses.filter(course => course.level === "beginner");
    const intermediateCourses = topicCourses.filter(course => course.level === "intermediate");
    const advancedCourses = topicCourses.filter(course => course.level === "advanced");
    
    res.status(200).json(
        new apiResponse("Topic-based recommendations fetched successfully", {
            topic,
            learningPath: {
                beginner: beginnerCourses,
                intermediate: intermediateCourses,
                advanced: advancedCourses
            },
            allCourses: topicCourses,
            recommendationType: "topic-based"
        })
    );
});

/**
 * Helper function to get the next level in the progression
 * @param {string} currentLevel - The current level
 * @returns {string} - The next level
 */
function getNextLevel(currentLevel) {
    const levels = ["beginner", "intermediate", "advanced"];
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentIndex === -1 || currentIndex === levels.length - 1) {
        return "advanced"; // Default to advanced if current level is not found or is already advanced
    }
    
    return levels[currentIndex + 1];
}

/**
 * Helper function to get complementary categories
 * @param {string} category - The current category
 * @returns {Array} - Array of complementary categories
 */
function getComplementaryCategories(category) {
    // Define complementary category mappings
    const complementaryMap = {
        "web-development": ["frontend-development", "backend-development", "fullstack-development"],
        "frontend-development": ["web-development", "ui-ux-design", "javascript"],
        "backend-development": ["web-development", "databases", "api-development"],
        "mobile-development": ["app-design", "react-native", "flutter"],
        "data-science": ["machine-learning", "statistics", "python"],
        "machine-learning": ["data-science", "artificial-intelligence", "python"],
        "devops": ["cloud-computing", "containerization", "ci-cd"],
        "cloud-computing": ["devops", "aws", "azure", "gcp"],
        "cybersecurity": ["network-security", "ethical-hacking", "security-compliance"],
        // Add more mappings as needed
    };
    
    return complementaryMap[category] || [];
}

export {
    searchCourses,
    getSearchSuggestions,
    getCollaborativeRecommendations,
    getContentBasedRecommendations,
    getContextualRecommendations,
    getTopicBasedRecommendations
};
