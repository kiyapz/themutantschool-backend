// controller/course.controller.js
import mongoose from "mongoose";
import tryCatch from "../utils/tryCatch.js";
import Instructor from "../models/instructor.model.js";
import Course from "../models/course.model.js";
import Section from "../models/courseSection.model.js";
import Lecture from "../models/sectionLecture.model.js";
import Review from "../models/courseReview.model.js";
import Enrollment from "../models/enrollment.model.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { cloudinary, uploadCloudinary } from "../utils/cloudinary.js";
import { priceList, thumbnailImgConfig } from "../utils/constant.js";

/**
 * Helper to inject mock instructor/user for development/testing
 * @param {Object} req - Express request object
 */
function injectMockInstructor(req) {
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
            username: "demoInstructor" 
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
 * @param {Array} fields - Array of fields to validate
 * @throws {Error} - If any field is missing or empty
 */
function validateRequiredFields(fields) {
    if (fields.some(value => value === undefined || (typeof value === 'string' && value.trim() === ""))) {
        throw new Error("All fields are required");
    }
}

/**
 * Adds a new resource (video or document) to a lecture
 * @param {Object} req - Express request object
 * @param {string} type - Resource type ('video' or 'raw')
 * @returns {Promise<Object>} - Updated lecture object
 */
async function addNewResourceToLecture(req, type) {
    injectMockInstructor(req);
    const instructor = req.instructor;
    let lectureResource = req.file?.path;
    const { lecture_id } = req.params;

    try {
        validateRequiredFields([lectureResource, lecture_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(lecture_id)) {
        throw new apiError(400, "Invalid lecture ID");
    }

    const lecture = await Lecture.findOne({
        instructor_id: instructor._id,
        _id: lecture_id
    });

    if (!lecture) {
        throw new apiError(404, "Lecture not found");
    }

    lectureResource = await uploadCloudinary(lectureResource, type);

    if (!lectureResource) {
        throw new apiError(500, `Failed to upload lecture ${type}`);
    }

    // Delete previous resource if exists
    if (lecture.resource?.public_id) {
        const dest = await cloudinary.uploader.destroy(
            lecture.resource.public_id, 
            { resource_type: lecture.type }
        );
        
        if (dest.result === "not found") {
            throw new apiError(500, "Failed to remove previous resource");
        }
    }

    const filename = lectureResource.original_filename.split("@$#-#$@")[1];

    lecture.resource = {
        public_id: lectureResource.public_id,
        secure_url: lectureResource.secure_url,
        duration: lectureResource.duration,
        filename: filename
    };

    lecture.type = type;
    lecture.approved = false;
    lecture.feedback = null;

    await lecture.save();
    return lecture;
}

/**
 * Creates a new course
 * @route POST /api/courses
 */
const createCourse = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { title, category } = req.body;

    try {
        validateRequiredFields([title, category]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    // Create the course
    const course = await Course.create({
        title,
        instructor_id: instructor._id,
        category
    });

    if (!course) {
        throw new apiError(500, "Failed to create course");
    }

    // Create default section
    const section = await Section.create({
        title: "Introduction",
        course_id: course._id,
        instructor_id: instructor._id
    });

    if (!section) {
        // Rollback course creation if section creation fails
        await Course.findByIdAndDelete(course._id);
        throw new apiError(500, "Failed to create default section");
    }

    // Create default lecture
    const lecture = await Lecture.create({
        title: "Introduction",
        instructor_id: instructor._id,
        section_id: section._id
    });

    if (!lecture) {
        // Rollback if lecture creation fails
        await Section.findByIdAndDelete(section._id);
        await Course.findByIdAndDelete(course._id);
        throw new apiError(500, "Failed to create default lecture");
    }

    // Add section to course
    course.sections.push(section._id);
    await course.save();

    res.status(201).json(
        new apiResponse("Course created successfully", course)
    );
});

/**
 * Creates a new section for a course
 * @route POST /api/courses/:course_id/sections
 */
const createSection = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { course_id } = req.params;
    const { title, learningObjective } = req.body;

    try {
        validateRequiredFields([title, course_id, learningObjective]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(course_id)) {
        throw new apiError(400, "Invalid course ID");
    }

    const course = await Course.findOne({
        instructor_id: instructor._id,
        _id: course_id
    });

    if (!course) {
        throw new apiError(404, "Course not found");
    }

    const section = await Section.create({
        title,
        learningObjective,
        course_id: course._id,
        instructor_id: instructor._id
    });

    if (!section) {
        throw new apiError(500, "Failed to create section");
    }

    course.sections.push(section._id);
    await course.save();

    res.status(201).json(
        new apiResponse("Section created successfully", section)
    );
});

/**
 * Adds a new lecture to a section
 * @route POST /api/courses/:given_course_id/sections/:given_section_id/lectures
 */
const addLectureTitle = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { title } = req.body;
    const { given_course_id, given_section_id } = req.params;

    try {
        validateRequiredFields([title, given_course_id, given_section_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(given_course_id) || !isValidObjectId(given_section_id)) {
        throw new apiError(400, "Invalid course or section ID");
    }

    const section = await Section.findOne({
        _id: given_section_id,
        course_id: given_course_id,
        instructor_id: instructor._id
    });

    if (!section) {
        throw new apiError(404, "Section not found");
    }

    const lecture = await Lecture.create({
        title,
        instructor_id: instructor._id,
        section_id: section._id
    });

    if (!lecture) {
        throw new apiError(500, "Failed to create lecture");
    }

    res.status(201).json(
        new apiResponse("Lecture created successfully", lecture)
    );
});

/**
 * Adds a video to a lecture
 * @route POST /api/lectures/:lecture_id/video
 */
const addVideoToLecture = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const lecture = await addNewResourceToLecture(req, "video");
    
    res.status(200).json(
        new apiResponse("Lecture video added successfully", lecture)
    );
});

/**
 * Adds a document file to a lecture
 * @route POST /api/lectures/:lecture_id/document
 */
const addFileToLecture = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const lecture = await addNewResourceToLecture(req, "raw");
    
    res.status(200).json(
        new apiResponse("Lecture document added successfully", lecture)
    );
});

/**
 * Updates a lecture title
 * @route PATCH /api/lectures/:lecture_id
 */
const updateLectureTitle = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { title } = req.body;
    const { lecture_id } = req.params;

    try {
        validateRequiredFields([title, lecture_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(lecture_id)) {
        throw new apiError(400, "Invalid lecture ID");
    }

    const lecture = await Lecture.findOneAndUpdate(
        {
            _id: lecture_id,
            instructor_id: instructor._id
        },
        {
            title: title
        },
        {
            new: true
        }
    );

    if (!lecture) {
        throw new apiError(404, "Lecture not found or failed to update title");
    }

    res.status(200).json(
        new apiResponse("Title updated successfully", lecture)
    );
});

/**
 * Updates a section title
 * @route PATCH /api/sections/:section_id
 */
const updateSectionTitle = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { title } = req.body;
    const { section_id } = req.params;

    try {
        validateRequiredFields([title, section_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(section_id)) {
        throw new apiError(400, "Invalid section ID");
    }

    const section = await Section.findOneAndUpdate(
        {
            _id: section_id,
            instructor_id: instructor._id
        },
        {
            title: title
        },
        {
            new: true
        }
    );

    if (!section) {
        throw new apiError(404, "Section not found or failed to update title");
    }

    res.status(200).json(
        new apiResponse("Title updated successfully", section)
    );
});

/**
 * Updates course media (thumbnail or trailer)
 * @route PATCH /api/courses/:course_id/media
 */
const updateMedia = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { course_id } = req.params;

    if (!isValidObjectId(course_id)) {
        throw new apiError(400, "Invalid course ID");
    }

    const thumbnailFile = req.files?.thumbnail ? req.files.thumbnail[0].path : undefined;
    const trailerFile = req.files?.trailerVideo ? req.files.trailerVideo[0].path : undefined;

    const file = thumbnailFile || trailerFile;
    const fieldname = thumbnailFile ? 'thumbnail' : (trailerFile ? 'trailerVideo' : undefined);

    if (!course_id || !file || !["trailerVideo", "thumbnail"].includes(fieldname)) {
        throw new apiError(400, "All fields are required");
    }

    const course = await Course.findOne({
        _id: course_id,
        instructor_id: instructor._id
    });

    if (!course) {
        throw new apiError(404, "Course not found");
    }

    const type = fieldname === "trailerVideo" ? "video" : "image";

    // Delete previous media if exists
    if (course[fieldname]?.public_id) {
        const dest = await cloudinary.uploader.destroy(
            course[fieldname].public_id, 
            { resource_type: type }
        );
        
        if (dest.result !== "ok" && dest.result !== "not found") {
            throw new apiError(500, `Failed to delete previous ${fieldname}`);
        }
    }

    const upload = await uploadCloudinary(file, type, thumbnailImgConfig);

    if (!upload) {
        throw new apiError(500, `Failed to upload new ${fieldname}`);
    }

    course[fieldname] = {
        public_id: upload.public_id,
        secure_url: upload.secure_url
    };

    await course.save();

    // Reset landing review if media is updated
    await Review.findOneAndUpdate(
        { course_id: course_id },
        {
            $set: {
                landing: null
            }
        }
    );

    res.status(200).json(
        new apiResponse(`${fieldname} uploaded successfully`)
    );
});

/**
 * Updates course details
 * @route PATCH /api/courses/:course_id
 */
const updateCourseDetails = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { description, title, subtitle, language, level, category, tags } = req.body;
    const { course_id } = req.params;

    try {
        validateRequiredFields([description, title, subtitle, language, level, category, course_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(course_id)) {
        throw new apiError(400, "Invalid course ID");
    }

    const course = await Course.findOne({
        _id: course_id,
        instructor_id: instructor._id
    });

    if (!course) {
        throw new apiError(404, "Course not found");
    }

    const fieldObj = { description, title, subtitle, language, level, category, tags };
    Object.keys(fieldObj).forEach((key) => {
        if (fieldObj[key] !== undefined) {
            course[key] = fieldObj[key];
        }
    });

    await course.save();

    // Reset landing review if course details are updated
    await Review.findOneAndUpdate(
        { course_id: course_id },
        {
            $set: {
                landing: null
            }
        }
    );

    res.status(200).json(
        new apiResponse("Course updated successfully", course)
    );
});

/**
 * Updates course price
 * @route PATCH /api/courses/:course_id/price
 */
const updateCoursePrice = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { profileCompleted } = instructor;
    const { course_id } = req.params;
    const { price } = req.body;

    if (!profileCompleted.status) {
        throw new apiError(400, "Complete premium profile before setting price");
    }

    try {
        validateRequiredFields([course_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(course_id)) {
        throw new apiError(400, "Invalid course ID");
    }

    if (price === undefined || !priceList.includes(price)) {
        throw new apiError(400, "Invalid price value");
    }

    const course = await Course.findOneAndUpdate(
        {
            _id: course_id,
            instructor_id: instructor._id,
        },
        {
            $set: { price }
        },
        { new: true }
    );

    if (!course) {
        throw new apiError(404, "Course not found or failed to update price");
    }

    res.status(200).json(
        new apiResponse("Price updated successfully", { price: course.price })
    );
});

/**
 * Deletes a lecture
 * @route DELETE /api/lectures/:lecture_id
 */
const deleteLecture = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { lecture_id } = req.params;

    try {
        validateRequiredFields([lecture_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(lecture_id)) {
        throw new apiError(400, "Invalid lecture ID");
    }

    const lecture = await Lecture.findOne({
        instructor_id: instructor._id,
        _id: lecture_id
    });

    if (!lecture) {
        throw new apiError(404, "Lecture not found");
    }

    // Delete resource from cloudinary if exists
    if (lecture.resource?.public_id) {
        const { public_id } = lecture.resource;
        const dest = await cloudinary.uploader.destroy(
            public_id,
            { resource_type: lecture.type }
        );
        
        if (dest.result !== "ok" && dest.result !== "not found") {
            throw new apiError(500, "Failed to delete lecture resource");
        }
    }

    const deletedLecture = await Lecture.findByIdAndDelete(lecture._id);

    if (!deletedLecture) {
        throw new apiError(500, "Failed to delete lecture");
    }

    res.status(200).json(
        new apiResponse("Lecture deleted successfully", { id: lecture_id })
    );
});

/**
 * Deletes a section
 * @route DELETE /api/sections/:section_id
 */
const deleteSection = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { section_id } = req.params;

    try {
        validateRequiredFields([section_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(section_id)) {
        throw new apiError(400, "Invalid section ID");
    }

    const section = await Section.findOne({
        instructor_id: instructor._id,
        _id: section_id
    });

    if (!section) {
        throw new apiError(404, "Section not found");
    }

    const lectures = await Lecture.find({ section_id: section._id });

    if (lectures.length > 0) {
        throw new apiError(400, "Delete all lectures in this section first");
    }

    const deletedSection = await Section.findByIdAndDelete(section._id);

    if (!deletedSection) {
        throw new apiError(500, "Failed to delete section");
    }

    // Remove section from course
    const course = await Course.findById(section.course_id);
    
    if (course) {
        course.sections = course.sections.filter(id => id.toString() !== section_id);
        await course.save();
    }

    res.status(200).json(
        new apiResponse("Section deleted successfully", { id: section_id })
    );
});

/**
 * Deletes a course
 * @route DELETE /api/courses/:course_id
 */
const deleteCourse = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { course_id } = req.params;

    try {
        validateRequiredFields([course_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(course_id)) {
        throw new apiError(400, "Invalid course ID");
    }

    const course = await Course.findOne({
        instructor_id: instructor._id,
        _id: course_id
    });

    if (!course) {
        throw new apiError(404, "Course not found");
    }

    const sections = await Section.find({ course_id: course._id });

    if (sections.length > 0) {
        throw new apiError(400, "Delete all sections of the course first");
    }

    // Delete thumbnail from cloudinary if exists
    if (course?.thumbnail?.public_id) {
        const delThumbnail = await cloudinary.uploader.destroy(
            course.thumbnail.public_id,
            { resource_type: "image" }
        );
        
        if (delThumbnail?.result !== "ok" && delThumbnail?.result !== "not found") {
            throw new apiError(500, "Failed to delete course thumbnail");
        }
    }

    // Delete trailer from cloudinary if exists
    if (course?.trailerVideo?.public_id) {
        const delTrailer = await cloudinary.uploader.destroy(
            course.trailerVideo.public_id,
            { resource_type: "video" }
        );
        
        if (delTrailer?.result !== "ok" && delTrailer?.result !== "not found") {
            throw new apiError(500, "Failed to delete course trailer");
        }
    }

    const deletedCourse = await Course.findByIdAndDelete(course._id);

    if (!deletedCourse) {
        throw new apiError(500, "Failed to delete course");
    }

    // Delete associated review
    await Review.findOneAndDelete({ course_id: course._id });

    res.status(200).json(
        new apiResponse("Course deleted successfully", { id: course_id })
    );
});

/**
 * Gets course details
 * @route GET /api/courses/:course_id
 */
const getCourseDetail = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { course_id } = req.params;

    try {
        validateRequiredFields([course_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(course_id)) {
        throw new apiError(400, "Invalid course ID");
    }

    const course = await Course.aggregate([
        {
            $match: {
                instructor_id: instructor._id,
                _id: new mongoose.Types.ObjectId(course_id)
            }
        },
        {
            $lookup: {
                from: "sections",
                localField: "_id",
                foreignField: "course_id",
                as: "sections",
                pipeline: [
                    {
                        $sort: {
                            createdAt: 1
                        }
                    },
                    {
                        $lookup: {
                            from: "lectures",
                            localField: "_id",
                            foreignField: "section_id",
                            as: "lectures",
                            pipeline: [
                                {
                                    $sort: {
                                        createdAt: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $project: {
                            lectures: {
                                section_id: 0,
                                createdAt: 0,
                                updatedAt: 0,
                                __v: 0,
                                instructor_id: 0
                            }
                        }
                    }
                ]
            }
        },
        {
            $project: {
                __v: 0,
                sections: {
                    __v: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    course_id: 0,
                    instructor_id: 0
                }
            }
        }
    ]);

    if (!course || course.length === 0) {
        throw new apiError(404, "Course not found");
    }

    res.status(200).json(
        new apiResponse("Course data fetched successfully", course[0])
    );
});

/**
 * Submits a course for approval
 * @route POST /api/courses/submit-for-approval
 */
const submitForApproval = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const user = req.user;
    const { course_id } = req.body;

    try {
        validateRequiredFields([course_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(course_id)) {
        throw new apiError(400, "Invalid course ID");
    }

    const course = await Course.findOne({
        _id: course_id,
        instructor_id: instructor._id
    });

    if (!course) {
        throw new apiError(404, "Course not found");
    }

    // Validate course has required elements before submission
    if (!course.thumbnail || !course.description || !course.title || !course.subtitle) {
        throw new apiError(400, "Course must have thumbnail, description, title, and subtitle before submission");
    }

    // Check if course has at least one section with lectures
    const sections = await Section.find({ course_id: course._id });
    
    if (sections.length === 0) {
        throw new apiError(400, "Course must have at least one section before submission");
    }
    
    for (const section of sections) {
        const lectures = await Lecture.find({ section_id: section._id });
        if (lectures.length === 0) {
            throw new apiError(400, `Section "${section.title}" must have at least one lecture before submission`);
        }
    }

    let approval = await Review.findOne({
        course_id: course_id,
    });

    if (!approval) {
        approval = await Review.create({
            course_id: course._id,
            instructorName: user.username
        });
    } else {
        if (approval.reviewed === false) {
            throw new apiError(400, "Course is already submitted for approval");
        }
        approval.reviewed = false;
        approval.approved = false; // Reset approval status
        approval.feedback = null; // Reset feedback
        await approval.save();
    }

    if (!approval) {
        throw new apiError(500, "Failed to submit for approval");
    }

    res.status(200).json(
        new apiResponse("Course submitted for approval successfully", { id: course_id })
    );
});

/**
 * Gets course approval status
 * @route GET /api/courses/:course_id/approval-status
 */
const approvalStatus = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { course_id } = req.params;

    try {
        validateRequiredFields([course_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(course_id)) {
        throw new apiError(400, "Invalid course ID");
    }

    const course = await Course.findOne({
        _id: course_id,
        instructor_id: instructor._id
    });

    if (!course) {
        throw new apiError(404, "Course not found");
    }

    const approvalData = await Review.findOne({
        course_id: course_id
    });

    if (!approvalData) {
        throw new apiError(404, "No approval data found for this course");
    }

    res.status(200).json(
        new apiResponse("Approval status fetched successfully", {
            reviewed: approvalData.reviewed,
            feedback: approvalData?.feedback,
            approvalStatus: approvalData?.approved,
            landing: approvalData?.landing,
            intended: approvalData?.intended,
            submittedAt: approvalData.createdAt,
            reviewedAt: approvalData.reviewedAt
        })
    );
});

/**
 * Updates course goals
 * @route PATCH /api/courses/:course_id/goals
 */
const updateGoals = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { objectives, prerequisites, intended_learners } = req.body;
    const { course_id } = req.params;

    try {
        validateRequiredFields([course_id]);
    } catch (error) {
        throw new apiError(400, error.message);
    }

    if (!isValidObjectId(course_id)) {
        throw new apiError(400, "Invalid course ID");
    }

    // Validate at least one field is provided
    if (!objectives && !prerequisites && !intended_learners) {
        throw new apiError(400, "At least one goal field must be provided");
    }

    const course = await Course.findOne({
        instructor_id: instructor._id,
        _id: course_id
    });

    if (!course) {
        throw new apiError(404, "Course not found");
    }

    // Update only provided fields
    if (!course.goals) {
        course.goals = {};
    }
    
    if (objectives) course.goals.objectives = objectives;
    if (prerequisites) course.goals.prerequisites = prerequisites;
    if (intended_learners) course.goals.intended_learners = intended_learners;
    
    await course.save();

    // Reset intended review if goals are updated
    await Review.findOneAndUpdate(
        { course_id: course_id },
        {
            $set: {
                intended: null
            }
        }
    );

    res.status(200).json(
        new apiResponse("Course goals updated successfully", course.goals)
    );
});

/**
 * Tracks lecture progress for a student
 * @route POST /api/courses/:course_id/lectures/:lecture_id/progress
 */
const trackLectureProgress = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const user = req.user;
    const { lecture_id, course_id, timeSpent, completed } = req.body;
    
    if (!lecture_id || !course_id || timeSpent === undefined) {
        throw new apiError(400, "Missing required fields");
    }
    
    if (!isValidObjectId(lecture_id) || !isValidObjectId(course_id)) {
        throw new apiError(400, "Invalid IDs provided");
    }
    
    // Validate lecture exists
    const lecture = await Lecture.findById(lecture_id);
    if (!lecture) {
        throw new apiError(404, "Lecture not found");
    }
    
    // Find or create enrollment
    let enrollment = await Enrollment.findOne({
        user_id: user._id,
        course_id
    });
    
    if (!enrollment) {
        enrollment = await Enrollment.create({
            user_id: user._id,
            course_id,
            completionStatus: "in-progress"
        });
    }
    
    // Update last accessed time
    enrollment.lastAccessedAt = new Date();
    
    // Add time spent
    enrollment.totalTimeSpent = (enrollment.totalTimeSpent || 0) + timeSpent;
    enrollment.weeklyTimeSpent = (enrollment.weeklyTimeSpent || 0) + timeSpent;
    
    // Mark lecture as completed if specified
    if (completed && !enrollment.completedLectures.includes(lecture_id)) {
        enrollment.completedLectures.push(lecture_id);
        
        // Calculate progress percentage
        const totalLectures = await Lecture.countDocuments({
            section_id: { $in: await Section.find({ course_id }).distinct('_id') }
        });
        
        enrollment.progress = (enrollment.completedLectures.length / totalLectures) * 100;
        
        // Update completion status if all lectures are completed
        if (enrollment.progress >= 100) {
            enrollment.completionStatus = "completed";
            
            // Generate certificate if not already issued
            if (!enrollment.certificateIssued) {
                // Generate certificate logic here
                enrollment.certificateIssued = true;
                enrollment.certificateUrl = `https://example.com/certificates/${enrollment._id}`;
            }
        }
    }
    
    await enrollment.save();
    
    res.status(200).json(
        new apiResponse("Progress tracked successfully", {
            progress: enrollment.progress,
            completionStatus: enrollment.completionStatus,
            completedLectures: enrollment.completedLectures.length,
            totalTimeSpent: enrollment.totalTimeSpent
        })
    );
});

/**
 * Adds a note to a lecture
 * @route POST /api/courses/:course_id/lectures/:lecture_id/notes
 */
const addLectureNote = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const user = req.user;
    const { lecture_id, course_id, note } = req.body;
    
    if (!lecture_id || !course_id || !note) {
        throw new apiError(400, "Missing required fields");
    }
    
    if (!isValidObjectId(lecture_id) || !isValidObjectId(course_id)) {
        throw new apiError(400, "Invalid IDs provided");
    }
    
    // Validate lecture exists
    const lecture = await Lecture.findById(lecture_id);
    if (!lecture) {
        throw new apiError(404, "Lecture not found");
    }
    
    // Find enrollment
    const enrollment = await Enrollment.findOne({
        user_id: user._id,
        course_id
    });
    
    if (!enrollment) {
        throw new apiError(404, "You are not enrolled in this course");
    }
    
    // Initialize notes array if it doesn't exist
    if (!enrollment.notes) {
        enrollment.notes = [];
    }
    
    // Add note
    const newNote = {
        lectureId: lecture_id,
        content: note,
        createdAt: new Date()
    };
    
    enrollment.notes.push(newNote);
    await enrollment.save();
    
    res.status(201).json(
        new apiResponse("Note added successfully", {
            noteId: enrollment.notes[enrollment.notes.length - 1]._id,
            note: newNote
        })
    );
});

/**
 * Gets course recommendations
 * @route GET /api/courses/recommendations
 */
const getCourseRecommendations = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const user = req.user;
    
    // Get user's enrolled courses
    const enrollments = await Enrollment.find({ user_id: user._id });
    const enrolledCourseIds = enrollments.map(e => e.course_id);
    
    // Get categories of enrolled courses
    const userCourses = await Course.find({ _id: { $in: enrolledCourseIds } });
    const userCategories = [...new Set(userCourses.map(c => c.category))];
    
    // Find similar courses in the same categories
    const similarCourses = await Course.find({
        _id: { $nin: enrolledCourseIds },
        category: { $in: userCategories },
        approved: true
    })
    .sort({ rating: -1 })
    .limit(5)
    .populate('instructor_id', 'username');
    
    // Find popular courses
    const popularCourses = await Course.find({
        _id: { $nin: enrolledCourseIds },
        approved: true
    })
    .sort({ enrollmentCount: -1 })
    .limit(5)
    .populate('instructor_id', 'username');
    
    // Find new courses
    const newCourses = await Course.find({
        _id: { $nin: enrolledCourseIds },
        approved: true
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('instructor_id', 'username');
    
    res.status(200).json(
        new apiResponse("Recommendations fetched successfully", {
            similarCourses,
            popularCourses,
            newCourses
        })
    );
});

export {
    createCourse,
    createSection,
    addLectureTitle,
    addVideoToLecture,
    addFileToLecture,
    updateLectureTitle,
    updateSectionTitle,
    updateCourseDetails,
    updateMedia,
    updateCoursePrice,
    updateGoals,
    deleteLecture,
    deleteSection,
    deleteCourse,
    getCourseDetail,
    submitForApproval,
    approvalStatus,
    trackLectureProgress,
    addLectureNote,
    getCourseRecommendations
};
