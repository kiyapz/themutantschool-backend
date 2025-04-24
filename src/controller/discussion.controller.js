// controllers/discussion.controller.js
import mongoose from "mongoose";
import Discussion from "../models/discussion.model.js";
import Course from "../models/course.model.js";
import Enrollment from "../models/enrollment.model.js";
import User from "../models/user.model.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import tryCatch from "../utils/tryCatch.js";
import { logger } from "../utils/logger.js";

/**
 * Helper to inject mock instructor/user for development/testing
 * @param {Object} req - Express request object
 */
function injectMockUser(req) {
    if (!req.instructor) {
        req.instructor = { 
            _id: new mongoose.Types.ObjectId("64b7f9f2e1b1c2a3d4e5f6a7"), 
            username: "demoInstructor", 
            profileCompleted: { status: true } 
        };
    }
    
    if (!req.user) {
        req.user = { 
            _id: new mongoose.Types.ObjectId("64b7f9f2e1b1c2a3d4e5f6a8"), 
            username: "demoUser" 
        };
    }
}

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Validates required fields
 * @param {Object} fields - Object containing fields to validate
 * @param {Array} requiredFields - Array of required field names
 * @throws {Error} - If any required field is missing
 */
function validateRequiredFields(fields, requiredFields) {
    const missingFields = requiredFields.filter(field => !fields[field]);
    if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
}

/**
 * Checks if user is authorized to access course content
 * @param {Object} user - User object
 * @param {Object} instructor - Instructor object
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} - Authorization result with isAuthorized and isInstructor flags
 */
async function checkCourseAuthorization(user, instructor, courseId) {
    if (!courseId || !isValidObjectId(courseId)) {
        throw new Error("Invalid course ID");
    }
    
    const course = await Course.findById(courseId);
    
    if (!course) {
        throw new Error("Course not found");
    }
    
    const isInstructor = course.instructor_id.toString() === instructor._id.toString();
    
    if (isInstructor) {
        return { isAuthorized: true, isInstructor: true, course };
    }
    
    const enrollment = await Enrollment.findOne({
        user_id: user._id,
        course_id: courseId
    });
    
    if (!enrollment) {
        throw new Error("You must be enrolled in this course to access discussions");
    }
    
    return { isAuthorized: true, isInstructor: false, course };
}

/**
 * Creates a new discussion thread
 * @route POST /api/discussions
 */
const createDiscussion = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    
    const { title, content, course_id, section_id, lecture_id, tags, isAnnouncement } = req.body;
    
    try {
        validateRequiredFields({ title, content, course_id }, ['title', 'content', 'course_id']);
    } catch (error) {
        return apiError(400, error.message);
    }
    
    if (!isValidObjectId(course_id)) {
        return apiError(400, "Invalid course ID");
    }
    
    if (section_id && !isValidObjectId(section_id)) {
        return apiError(400, "Invalid section ID");
    }
    
    if (lecture_id && !isValidObjectId(lecture_id)) {
        return apiError(400, "Invalid lecture ID");
    }
    
    // Check authorization
    let authResult;
    try {
        authResult = await checkCourseAuthorization(user, req.instructor, course_id);
    } catch (error) {
        return apiError(error.message.includes("not found") ? 404 : 403, error.message);
    }
    
    // Only instructors can create announcements
    if (isAnnouncement && !authResult.isInstructor) {
        return apiError(403, "Only instructors can create announcements");
    }
    
    // Sanitize and validate content
    const sanitizedTitle = title.trim();
    const sanitizedContent = content.trim();
    
    if (sanitizedTitle.length < 3) {
        return apiError(400, "Title must be at least 3 characters long");
    }
    
    if (sanitizedContent.length < 10) {
        return apiError(400, "Content must be at least 10 characters long");
    }
    
    // Create the discussion
    const discussion = await Discussion.create({
        title: sanitizedTitle,
        content: sanitizedContent,
        course_id,
        section_id: section_id || null,
        lecture_id: lecture_id || null,
        author_id: user._id,
        tags: Array.isArray(tags) ? tags.filter(Boolean).map(tag => tag.trim()) : [],
        isAnnouncement: isAnnouncement && authResult.isInstructor,
        createdAt: new Date()
    });
    
    // Populate author information
    const populatedDiscussion = await Discussion.findById(discussion._id)
        .populate('author_id', 'username avatar');
    
    // Log the activity
    logger.info(`Discussion created: ${discussion._id} by user ${user._id} in course ${course_id}`);
    
    res.status(201).json(
        new apiResponse("Discussion created successfully", populatedDiscussion)
    );
});

/**
 * Gets discussions for a course with filtering and pagination
 * @route GET /api/discussions/course/:course_id
 */
const getCourseDiscussions = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    const { course_id } = req.params;
    const { 
        section_id, 
        lecture_id, 
        sort = 'default', 
        filter, 
        page = 1, 
        limit = 10,
        search
    } = req.query;
    
    if (!course_id || !isValidObjectId(course_id)) {
        return apiError(400, "Invalid course ID");
    }
    
    // Check authorization
    try {
        await checkCourseAuthorization(user, req.instructor, course_id);
    } catch (error) {
        return apiError(error.message.includes("not found") ? 404 : 403, error.message);
    }
    
    // Build query
    const query = { course_id };
    
    if (section_id && isValidObjectId(section_id)) {
        query.section_id = section_id;
    }
    
    if (lecture_id && isValidObjectId(lecture_id)) {
        query.lecture_id = lecture_id;
    }
    
    // Apply search if provided
    if (search && typeof search === 'string' && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
            { title: searchRegex },
            { content: searchRegex },
            { tags: searchRegex }
        ];
    }
    
    // Apply filters
    if (filter === 'announcements') {
        query.isAnnouncement = true;
    } else if (filter === 'pinned') {
        query.isPinned = true;
    } else if (filter === 'my-posts') {
        query.author_id = user._id;
    } else if (filter === 'unanswered') {
        query['replies.0'] = { $exists: false };
    } else if (filter === 'instructor-responses') {
        query['replies.isInstructorResponse'] = true;
    }
    
    // Determine sort order
    let sortOptions = {};
    
    if (sort === 'newest') {
        sortOptions = { createdAt: -1 };
    } else if (sort === 'oldest') {
        sortOptions = { createdAt: 1 };
    } else if (sort === 'most-viewed') {
        sortOptions = { views: -1, createdAt: -1 };
    } else if (sort === 'most-upvoted') {
        sortOptions = { 'upvotes.length': -1, createdAt: -1 };
    } else if (sort === 'most-active') {
        sortOptions = { 'replies.length': -1, createdAt: -1 };
    } else {
        // Default sort: pinned first, then announcements, then newest
        sortOptions = { isPinned: -1, isAnnouncement: -1, createdAt: -1 };
    }
    
    // Validate and parse pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;
    
    // Execute query with pagination
    const discussions = await Discussion.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('author_id', 'username avatar')
        .populate({
            path: 'replies.author_id',
            select: 'username avatar'
        })
        .lean();
    
    // Get total count for pagination
    const total = await Discussion.countDocuments(query);
    
    // Track view counts in a non-blocking way
    if (discussions.length > 0) {
        const discussionIds = discussions.map(d => d._id);
        Discussion.updateMany(
            { _id: { $in: discussionIds } },
            { $inc: { views: 1 } }
        ).exec().catch(err => logger.error(`Failed to update view counts: ${err.message}`));
    }
    
    // Add metadata to each discussion
    const enhancedDiscussions = discussions.map(discussion => ({
        ...discussion,
        replyCount: discussion.replies?.length || 0,
        upvoteCount: discussion.upvotes?.length || 0,
        isUpvotedByUser: discussion.upvotes?.some(id => id.toString() === user._id.toString()) || false,
        lastActivity: discussion.replies?.length > 0 
            ? discussion.replies[discussion.replies.length - 1].createdAt 
            : discussion.createdAt
    }));
    
    res.status(200).json(
        new apiResponse("Discussions fetched successfully", {
            discussions: enhancedDiscussions,
            pagination: {
                total,
                page: pageNum,
                pages: Math.ceil(total / limitNum),
                limit: limitNum,
                hasMore: pageNum * limitNum < total
            }
        })
    );
});

/**
 * Gets a single discussion by ID with all replies
 * @route GET /api/discussions/:discussion_id
 */
const getDiscussionById = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    const { discussion_id } = req.params;
    
    if (!discussion_id || !isValidObjectId(discussion_id)) {
        return apiError(400, "Invalid discussion ID");
    }
    
    const discussion = await Discussion.findById(discussion_id)
        .populate('author_id', 'username avatar')
        .populate({
            path: 'replies.author_id',
            select: 'username avatar'
        });
    
    if (!discussion) {
        return apiError(404, "Discussion not found");
    }
    
    // Check authorization
    try {
        await checkCourseAuthorization(user, req.instructor, discussion.course_id);
    } catch (error) {
        return apiError(error.message.includes("not found") ? 404 : 403, error.message);
    }
    
    // Increment view count
    discussion.views = (discussion.views || 0) + 1;
    await discussion.save();
    
    // Convert to plain object and add metadata
    const result = discussion.toObject();
    result.isUpvotedByUser = discussion.upvotes.some(id => id.toString() === user._id.toString());
    result.upvoteCount = discussion.upvotes.length;
    result.replyCount = discussion.replies.length;
    
    res.status(200).json(
        new apiResponse("Discussion fetched successfully", result)
    );
});

/**
 * Adds a reply to a discussion
 * @route POST /api/discussions/:discussion_id/reply
 */
const addReply = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    const { discussion_id } = req.params;
    const { content, parentReplyId } = req.body;
    
    try {
        validateRequiredFields({ discussion_id, content }, ['discussion_id', 'content']);
    } catch (error) {
        return apiError(400, error.message);
    }
    
    if (!isValidObjectId(discussion_id)) {
        return apiError(400, "Invalid discussion ID");
    }
    
    if (parentReplyId && !isValidObjectId(parentReplyId)) {
        return apiError(400, "Invalid parent reply ID");
    }
    
    const discussion = await Discussion.findById(discussion_id);
    
    if (!discussion) {
        return apiError(404, "Discussion not found");
    }
    
    // Check authorization
    let authResult;
    try {
        authResult = await checkCourseAuthorization(user, req.instructor, discussion.course_id);
    } catch (error) {
        return apiError(error.message.includes("not found") ? 404 : 403, error.message);
    }
    
    // Sanitize and validate content
    const sanitizedContent = content.trim();
    
    if (sanitizedContent.length < 5) {
        return apiError(400, "Reply content must be at least 5 characters long");
    }
    
    // Create the reply object
    const newReply = {
        content: sanitizedContent,
        author_id: user._id,
        isInstructorResponse: authResult.isInstructor,
        createdAt: new Date(),
        parentReplyId: parentReplyId || null,
        upvotes: []
    };
    
    // Add reply to discussion
    discussion.replies.push(newReply);
    
    // If this is the first reply, update the discussion status
    if (discussion.replies.length === 1) {
        discussion.hasReplies = true;
    }
    
    // Update last activity timestamp
    discussion.lastActivityAt = new Date();
    
    await discussion.save();
    
    // Populate author info for the new reply
    const populatedDiscussion = await Discussion.findById(discussion_id)
        .populate('replies.author_id', 'username avatar');
    
    const newReplyIndex = populatedDiscussion.replies.length - 1;
    const populatedReply = populatedDiscussion.replies[newReplyIndex];
    
    // Log the activity
    logger.info(`Reply added to discussion ${discussion_id} by user ${user._id}`);
    
    res.status(201).json(
        new apiResponse("Reply added successfully", {
            reply: populatedReply,
            replyCount: populatedDiscussion.replies.length
        })
    );
});

/**
 * Updates a discussion
 * @route PATCH /api/discussions/:discussion_id
 */
const updateDiscussion = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    const { discussion_id } = req.params;
    const { title, content, tags } = req.body;
    
    if (!discussion_id || !isValidObjectId(discussion_id)) {
        return apiError(400, "Invalid discussion ID");
    }
    
    const discussion = await Discussion.findById(discussion_id);
    
    if (!discussion) {
        return apiError(404, "Discussion not found");
    }
    
    // Only the author or instructor can update a discussion
    const isAuthor = discussion.author_id.toString() === user._id.toString();
    
    if (!isAuthor) {
        // Check if user is the instructor
        const course = await Course.findById(discussion.course_id);
        
        if (!course) {
            return apiError(404, "Course not found");
        }
        
        const isInstructor = course.instructor_id.toString() === req.instructor._id.toString();
        
        if (!isInstructor) {
            return apiError(403, "You can only edit your own discussions");
        }
    }
    
    // Update fields if provided
    if (title && typeof title === 'string') {
        const sanitizedTitle = title.trim();
        if (sanitizedTitle.length < 3) {
            return apiError(400, "Title must be at least 3 characters long");
        }
        discussion.title = sanitizedTitle;
    }
    
    if (content && typeof content === 'string') {
        const sanitizedContent = content.trim();
        if (sanitizedContent.length < 10) {
            return apiError(400, "Content must be at least 10 characters long");
        }
        discussion.content = sanitizedContent;
    }
    
    if (tags && Array.isArray(tags)) {
        discussion.tags = tags.filter(Boolean).map(tag => tag.trim());
    }
    
    // Mark as edited
    discussion.isEdited = true;
    discussion.updatedAt = new Date();
    
    await discussion.save();
    
    res.status(200).json(
        new apiResponse("Discussion updated successfully", discussion)
    );
});

/**
 * Updates a reply
 * @route PATCH /api/discussions/:discussion_id/replies/:reply_id
 */
const updateReply = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    const { discussion_id, reply_id } = req.params;
    const { content } = req.body;
    
    if (!discussion_id || !isValidObjectId(discussion_id) || !reply_id) {
        return apiError(400, "Invalid discussion or reply ID");
    }
    
    if (!content || typeof content !== 'string' || content.trim().length < 5) {
        return apiError(400, "Reply content must be at least 5 characters long");
    }
    
    const discussion = await Discussion.findById(discussion_id);
    
    if (!discussion) {
        return apiError(404, "Discussion not found");
    }
    
    // Find the reply
    const replyIndex = discussion.replies.findIndex(reply => reply._id.toString() === reply_id);
    
    if (replyIndex === -1) {
        return apiError(404, "Reply not found");
    }
    
    const reply = discussion.replies[replyIndex];
    
    // Check if user is authorized to edit this reply
    const isReplyAuthor = reply.author_id.toString() === user._id.toString();
    
    if (!isReplyAuthor) {
        // Check if user is the instructor
        const course = await Course.findById(discussion.course_id);
        
        if (!course) {
            return apiError(404, "Course not found");
        }
        
        const isInstructor = course.instructor_id.toString() === req.instructor._id.toString();
        
        if (!isInstructor) {
            return apiError(403, "You can only edit your own replies");
        }
    }
    
    // Update the reply
    reply.content = content.trim();
    reply.isEdited = true;
    reply.updatedAt = new Date();
    
    // Save the updated discussion
    await discussion.save();
    
    res.status(200).json(
        new apiResponse("Reply updated successfully", reply)
    );
});

/**
 * Toggles pin status of a discussion (instructor only)
 * @route PATCH /api/discussions/:discussion_id/pin
 */
const togglePinStatus = tryCatch(async (req, res) => {
    injectMockUser(req);
    const instructor = req.instructor;
    const { discussion_id } = req.params;
    
    if (!discussion_id || !isValidObjectId(discussion_id)) {
        return apiError(400, "Invalid discussion ID");
    }
    
    const discussion = await Discussion.findById(discussion_id);
    
    if (!discussion) {
        return apiError(404, "Discussion not found");
    }
    
    // Check if user is the instructor of the course
    const course = await Course.findById(discussion.course_id);
    
    if (!course) {
        return apiError(404, "Course not found");
    }
    
    if (course.instructor_id.toString() !== instructor._id.toString()) {
        return apiError(403, "Only the course instructor can pin discussions");
    }
    
    // Toggle pin status
    discussion.isPinned = !discussion.isPinned;
    discussion.updatedAt = new Date();
    await discussion.save();
    
    // Log the action
    logger.info(`Discussion ${discussion_id} ${discussion.isPinned ? 'pinned' : 'unpinned'} by instructor ${instructor._id}`);
    
    res.status(200).json(
        new apiResponse(`Discussion ${discussion.isPinned ? 'pinned' : 'unpinned'} successfully`, {
            isPinned: discussion.isPinned
        })
    );
});

/**
 * Toggles upvote on a discussion
 * @route PATCH /api/discussions/:discussion_id/upvote
 */
const toggleUpvote = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    const { discussion_id } = req.params;
    
    if (!discussion_id || !isValidObjectId(discussion_id)) {
        return apiError(400, "Invalid discussion ID");
    }
    
    const discussion = await Discussion.findById(discussion_id);
    
    if (!discussion) {
        return apiError(404, "Discussion not found");
    }
    
    // Check if user is enrolled in the course
    try {
        await checkCourseAuthorization(user, req.instructor, discussion.course_id);
    } catch (error) {
        return apiError(error.message.includes("not found") ? 404 : 403, error.message);
    }
    
    // Toggle upvote
    const userIdStr = user._id.toString();
    const upvoteIndex = discussion.upvotes.findIndex(id => id.toString() === userIdStr);
    
    if (upvoteIndex === -1) {
        discussion.upvotes.push(user._id);
    } else {
        discussion.upvotes.splice(upvoteIndex, 1);
    }
    
    await discussion.save();
    
    res.status(200).json(
        new apiResponse("Upvote toggled successfully", {
            upvoted: upvoteIndex === -1,
            upvoteCount: discussion.upvotes.length
        })
    );
});

/**
 * Toggles upvote on a reply
 * @route PATCH /api/discussions/:discussion_id/replies/:reply_id/upvote
 */
const toggleReplyUpvote = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    const { discussion_id, reply_id } = req.params;
    
    if (!discussion_id || !isValidObjectId(discussion_id) || !reply_id) {
        return apiError(400, "Invalid discussion or reply ID");
    }
    
    const discussion = await Discussion.findById(discussion_id);
    
    if (!discussion) {
        return apiError(404, "Discussion not found");
    }
    
    // Check if user is enrolled in the course
    try {
        await checkCourseAuthorization(user, req.instructor, discussion.course_id);
    } catch (error) {
        return apiError(error.message.includes("not found") ? 404 : 403, error.message);
    }
    
    // Find the reply
    const replyIndex = discussion.replies.findIndex(reply => reply._id.toString() === reply_id);
    
    if (replyIndex === -1) {
        return apiError(404, "Reply not found");
    }
    
    // Initialize upvotes array if it doesn't exist
    if (!discussion.replies[replyIndex].upvotes) {
        discussion.replies[replyIndex].upvotes = [];
    }
    
    // Toggle upvote
    const userIdStr = user._id.toString();
    const upvotes = discussion.replies[replyIndex].upvotes;
    const upvoteIndex = upvotes.findIndex(id => id.toString() === userIdStr);
    
    if (upvoteIndex === -1) {
        upvotes.push(user._id);
    } else {
        upvotes.splice(upvoteIndex, 1);
    }
    
    await discussion.save();
    
    res.status(200).json(
        new apiResponse("Reply upvote toggled successfully", {
            upvoted: upvoteIndex === -1,
            upvoteCount: upvotes.length
        })
    );
});

/**
 * Deletes a discussion (author or instructor only)
 * @route DELETE /api/discussions/:discussion_id
 */
const deleteDiscussion = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    const { discussion_id } = req.params;
    
    if (!discussion_id || !isValidObjectId(discussion_id)) {
        return apiError(400, "Invalid discussion ID");
    }
    
    const discussion = await Discussion.findById(discussion_id);
    
    if (!discussion) {
        return apiError(404, "Discussion not found");
    }
    
    // Check if user is authorized to delete
    const isAuthor = discussion.author_id.toString() === user._id.toString();
    
    if (!isAuthor) {
        // Check if user is the instructor
        const course = await Course.findById(discussion.course_id);
        
        if (!course) {
            return apiError(404, "Course not found");
        }
        
        const isInstructor = course.instructor_id.toString() === req.instructor._id.toString();
        
        if (!isInstructor) {
            return apiError(403, "You can only delete your own discussions");
        }
    }
    
    // Delete the discussion
    await Discussion.findByIdAndDelete(discussion_id);
    
    // Log the deletion
    logger.info(`Discussion ${discussion_id} deleted by ${isAuthor ? 'author' : 'instructor'} ${user._id}`);
    
    res.status(200).json(
        new apiResponse("Discussion deleted successfully", { id: discussion_id })
    );
});

/**
 * Deletes a reply (author or instructor only)
 * @route DELETE /api/discussions/:discussion_id/replies/:reply_id
 */
const deleteReply = tryCatch(async (req, res) => {
    injectMockUser(req);
    const user = req.user;
    const { discussion_id, reply_id } = req.params;
    
    if (!discussion_id || !isValidObjectId(discussion_id) || !reply_id) {
        return apiError(400, "Invalid discussion or reply ID");
    }
    
    const discussion = await Discussion.findById(discussion_id);
    
    if (!discussion) {
        return apiError(404, "Discussion not found");
    }
    
    // Find the reply
    const replyIndex = discussion.replies.findIndex(reply => reply._id.toString() === reply_id);
    
    if (replyIndex === -1) {
        return apiError(404, "Reply not found");
    }
    
    const reply = discussion.replies[replyIndex];
    
    // Check if user is authorized to delete
    const isReplyAuthor = reply.author_id.toString() === user._id.toString();
    
    if (!isReplyAuthor) {
        // Check if user is the instructor
        const course = await Course.findById(discussion.course_id);
        
        if (!course) {
            return apiError(404, "Course not found");
        }
        
        const isInstructor = course.instructor_id.toString() === req.instructor._id.toString();
        
        if (!isInstructor) {
            return apiError(403, "You can only delete your own replies");
        }
    }
    
    // Remove the reply
    discussion.replies.splice(replyIndex, 1);
    
    // Update hasReplies flag if needed
    if (discussion.replies.length === 0) {
        discussion.hasReplies = false;
    }
    
    // Update last activity timestamp
    discussion.lastActivityAt = new Date();
    
    await discussion.save();
    
    // Log the deletion
    logger.info(`Reply ${reply_id} deleted from discussion ${discussion_id} by ${isReplyAuthor ? 'author' : 'instructor'} ${user._id}`);
    
    res.status(200).json(
        new apiResponse("Reply deleted successfully", { 
            id: reply_id,
            replyCount: discussion.replies.length
        })
    );
});

export {
    createDiscussion,
    getCourseDiscussions,
    getDiscussionById,
    addReply,
    updateDiscussion,
    updateReply,
    togglePinStatus,
    toggleUpvote,
    toggleReplyUpvote,
    deleteDiscussion,
    deleteReply
};
