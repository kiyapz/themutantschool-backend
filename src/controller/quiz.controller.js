// controllers/quiz.controller.js
import mongoose from "mongoose";
import Quiz from "../models/quiz.model.js";
import Enrollment from "../models/enrollment.model.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import tryCatch from "../utils/tryCatch.js";

// Helper to inject mock instructor/user
function injectMockInstructor(req) {
    if (!req.instructor) req.instructor = { _id: new mongoose.Types.ObjectId("64b7f9f2e1b1c2a3d4e5f6a7"), username: "demoInstructor", profileCompleted: { status: true } };
    if (!req.user) req.user = { _id: new mongoose.Types.ObjectId("64b7f9f2e1b1c2a3d4e5f6a8"), username: "demoInstructor" };
}

// Validate ObjectId utility
function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

// Create a new quiz
const createQuiz = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    
    const { 
        title, 
        description, 
        course_id, 
        section_id, 
        timeLimit, 
        passingScore,
        questions,
        allowRetake,
        maxAttempts,
        showAnswers
    } = req.body;
    
    if (!title || !course_id || !questions || questions.length === 0) {
        return apiError(400, "Missing required fields");
    }
    
    if (!isValidObjectId(course_id)) {
        return apiError(400, "Invalid course ID");
    }
    
    if (section_id && !isValidObjectId(section_id)) {
        return apiError(400, "Invalid section ID");
    }
    
    // Validate questions
    for (const question of questions) {
        if (!question.questionText) {
            return apiError(400, "All questions must have question text");
        }
        
        if (question.questionType === "multiple-choice") {
            if (!question.options || question.options.length < 2) {
                return apiError(400, "Multiple choice questions must have at least 2 options");
            }
            
            if (!question.options.some(option => option.isCorrect)) {
                return apiError(400, "Multiple choice questions must have at least one correct answer");
            }
        }
        
        if (question.questionType === "short-answer" && !question.correctAnswer) {
            return apiError(400, "Short answer questions must have a correct answer");
        }
    }
    
    const quiz = await Quiz.create({
        title,
        description,
        course_id,
        section_id,
        instructor_id: instructor._id,
        timeLimit: timeLimit || 30,
        passingScore: passingScore || 70,
        questions,
        allowRetake: allowRetake !== undefined ? allowRetake : true,
        maxAttempts: maxAttempts || 3,
        showAnswers: showAnswers !== undefined ? showAnswers : true
    });
    
    res.status(201).json(
        new apiResponse("Quiz created successfully", quiz)
    );
});

// Update a quiz
const updateQuiz = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { quiz_id } = req.params;
    
    if (!quiz_id || !isValidObjectId(quiz_id)) {
        return apiError(400, "Invalid quiz ID");
    }
    
    const quiz = await Quiz.findOne({
        _id: quiz_id,
        instructor_id: instructor._id
    });
    
    if (!quiz) {
        return apiError(404, "Quiz not found");
    }
    
    // If quiz is published, only certain fields can be updated
    if (quiz.isPublished) {
        const { title, description, timeLimit, allowRetake, maxAttempts, showAnswers } = req.body;
        
        // Only update allowed fields for published quizzes
        if (title) quiz.title = title;
        if (description) quiz.description = description;
        if (timeLimit) quiz.timeLimit = timeLimit;
        if (allowRetake !== undefined) quiz.allowRetake = allowRetake;
        if (maxAttempts) quiz.maxAttempts = maxAttempts;
        if (showAnswers !== undefined) quiz.showAnswers = showAnswers;
    } else {
        // For unpublished quizzes, all fields can be updated
        const updateFields = req.body;
        
        // Update each field if provided
        Object.keys(updateFields).forEach(field => {
            if (field !== '_id' && field !== 'instructor_id') {
                quiz[field] = updateFields[field];
            }
        });
    }
    
    await quiz.save();
    
    res.status(200).json(
        new apiResponse("Quiz updated successfully", quiz)
    );
});

// Publish a quiz
const publishQuiz = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const instructor = req.instructor;
    const { quiz_id } = req.params;
    
    if (!quiz_id || !isValidObjectId(quiz_id)) {
        return apiError(400, "Invalid quiz ID");
    }
    
    const quiz = await Quiz.findOne({
        _id: quiz_id,
        instructor_id: instructor._id
    });
    
    if (!quiz) {
        return apiError(404, "Quiz not found");
    }
    
    // Validate quiz before publishing
    if (quiz.questions.length === 0) {
        return apiError(400, "Quiz must have at least one question");
    }
    
    quiz.isPublished = true;
    await quiz.save();
    
    res.status(200).json(
        new apiResponse("Quiz published successfully", { isPublished: true })
    );
});

// Submit quiz attempt
const submitQuizAttempt = tryCatch(async (req, res) => {
    injectMockInstructor(req);
    const user = req.user;
    const { quiz_id } = req.params;
    const { answers, timeSpent } = req.body;
    
    if (!quiz_id || !isValidObjectId(quiz_id) || !answers) {
        return apiError(400, "Missing required fields");
    }
    
    const quiz = await Quiz.findById(quiz_id);
    
    if (!quiz) {
        return apiError(404, "Quiz not found");
    }
    
    if (!quiz.isPublished) {
        return apiError(400, "Quiz is not published yet");
    }
    
    // Find enrollment for this course
    const enrollment = await Enrollment.findOne({
        user_id: user._id,
        course_id: quiz.course_id
    });
    
    if (!enrollment) {
        return apiError(404, "You are not enrolled in this course");
    }
    
    // Check if user has exceeded max attempts
    const previousAttempts = enrollment.quizScores.filter(q => 
        q.quizId.toString() === quiz_id
    );
    
    if (previousAttempts.length >= quiz.maxAttempts && !quiz.allowRetake) {
        return apiError(400, "You have exceeded the maximum number of attempts for this quiz");
    }
    
    // Calculate score
    let score = 0;
    const maxScore = quiz.questions.reduce((total, q) => total + q.points, 0);
    
    // Process answers
    for (const [questionIndex, answer] of Object.entries(answers)) {
        const question = quiz.questions[questionIndex];
        
        if (!question) continue;
        
        if (question.questionType === "multiple-choice") {
            // For multiple choice, check if selected option is correct
            const selectedOption = question.options[answer];
            if (selectedOption && selectedOption.isCorrect) {
                score += question.points;
            }
        } else if (question.questionType === "true-false") {
            // For true-false, check if answer matches correct answer
            if (answer === "true" && question.options[0].isCorrect) {
                score += question.points;
            } else if (answer === "false" && question.options[1].isCorrect) {
                score += question.points;
            }
        } else if (question.questionType === "short-answer") {
            // For short answer, check if answer matches correct answer (case insensitive)
            if (answer.toLowerCase() === question.correctAnswer.toLowerCase()) {
                score += question.points;
            }
        }
    }
    
    // Calculate percentage score
    const percentageScore = (score / maxScore) * 100;
    const passed = percentageScore >= quiz.passingScore;
    
    // Add quiz score to enrollment
    enrollment.quizScores.push({
        quizId: quiz._id,
        score: percentageScore,
        maxScore: maxScore,
        passStatus: passed,
        attemptedAt: new Date()
    });
    
    await enrollment.save();
    
    // Prepare results to return
    const results = {
        score: percentageScore,
        maxScore: maxScore,
        passed: passed,
        passingScore: quiz.passingScore,
        timeSpent: timeSpent || 0,
        attemptNumber: previousAttempts.length + 1,
        maxAttempts: quiz.maxAttempts,
        allowRetake: quiz.allowRetake,
        showAnswers: quiz.showAnswers
    };
    
    // If showAnswers is true, include correct answers
    if (quiz.showAnswers) {
        results.correctAnswers = quiz.questions.map(q => {
            if (q.questionType === "multiple-choice") {
                return q.options.findIndex(opt => opt.isCorrect);
            } else if (q.questionType === "true-false") {
                return q.options[0].isCorrect ? "true" : "false";
            } else {
                return q.correctAnswer;
            }
        });
    }
    
    res.status(200).json(
        new apiResponse("Quiz submitted successfully", results)
    );
});

export {
    createQuiz,
    updateQuiz,
    publishQuiz,
    submitQuizAttempt
};
