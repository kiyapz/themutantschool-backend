// constants.js
/**
 * Constants for the e-learning platform
 * These values are used throughout the application to maintain consistency
 */

// Price tiers available for courses (in USD)
const priceList = [0, 9.99, 19.99, 29.99, 49.99, 59.99, 79.99, 99.99, 149.99, 199.99];

// Cloudinary configuration for thumbnail images
const thumbnailImgConfig = {
  folder: "course-thumbnails",
  transformation: [
    { width: 1280, height: 720, crop: "fill" },
    { quality: "auto:good" }
  ],
  format: "webp"
};

// Course levels
const courseLevels = [
  "beginner",
  "intermediate",
  "advanced",
  "all-levels"
];

// Course categories
const courseCategories = [
  "web-development",
  "mobile-development",
  "data-science",
  "machine-learning",
  "devops",
  "cloud-computing",
  "cybersecurity",
  "blockchain",
  "game-development",
  "design",
  "marketing",
  "business",
  "photography",
  "music",
  "health-fitness",
  "language-learning",
  "personal-development",
  "academic",
  "other"
];

// Course languages
const courseLanguages = [
  "english",
  "spanish",
  "french",
  "german",
  "chinese",
  "japanese",
  "hindi",
  "arabic",
  "portuguese",
  "russian",
  "other"
];

// Video upload configuration
const videoUploadConfig = {
  folder: "course-videos",
  resource_type: "video",
  eager: [
    { format: "mp4", quality: "auto:good" }
  ],
  eager_async: true,
  chunk_size: 6000000 // 6MB chunks for better upload performance
};

// Document upload configuration
const documentUploadConfig = {
  folder: "course-documents",
  resource_type: "raw",
  format: "auto"
};

// Certificate template configuration
const certificateConfig = {
  template: {
    width: 1754,
    height: 1240,
    background: "#ffffff",
    border: {
      color: "#000000",
      width: 5
    },
    logo: {
      url: "https://example.com/logo.png",
      position: { x: 877, y: 150 }
    }
  },
  fonts: {
    title: {
      family: "Montserrat",
      size: 60,
      weight: "bold",
      color: "#333333"
    },
    name: {
      family: "Montserrat",
      size: 48,
      weight: "bold",
      color: "#333333"
    },
    course: {
      family: "Montserrat",
      size: 36,
      weight: "regular",
      color: "#333333"
    },
    date: {
      family: "Montserrat",
      size: 24,
      weight: "regular",
      color: "#333333"
    }
  }
};

// Pagination defaults
const paginationDefaults = {
  defaultLimit: 10,
  maxLimit: 100
};

// Quiz configuration
const quizConfig = {
  defaultTimeLimit: 30, // minutes
  defaultPassingScore: 70, // percentage
  defaultMaxAttempts: 3,
  questionTypes: ["multiple-choice", "true-false", "short-answer"]
};

// API response status codes and messages
const apiStatus = {
  success: {
    code: 200,
    message: "Success"
  },
  created: {
    code: 201,
    message: "Resource created successfully"
  },
  badRequest: {
    code: 400,
    message: "Bad request"
  },
  unauthorized: {
    code: 401,
    message: "Unauthorized"
  },
  forbidden: {
    code: 403,
    message: "Forbidden"
  },
  notFound: {
    code: 404,
    message: "Resource not found"
  },
  serverError: {
    code: 500,
    message: "Internal server error"
  }
};

// Enrollment status types
const enrollmentStatus = {
  NOT_STARTED: "not-started",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed"
};

// Review rating scale
const ratingScale = {
  min: 1,
  max: 5,
  step: 0.5
};

// Export all constants
export {
  priceList,
  thumbnailImgConfig,
  courseLevels,
  courseCategories,
  courseLanguages,
  videoUploadConfig,
  documentUploadConfig,
  certificateConfig,
  paginationDefaults,
  quizConfig,
  apiStatus,
  enrollmentStatus,
  ratingScale
};
