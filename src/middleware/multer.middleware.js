// src/middleware/multer.middleware.js
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import apiError from '../utils/apiError.js';

// Create uploads directory if it doesn't exist
const uploadDir = './uploads/original';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, './uploads/original');
  },
  filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for videos
const fileFilter = (req, file, cb) => {
    // Accept video files only
    if (file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new apiError(400, 'Only video files are allowed'), false);
    }
};

// Create multer instance
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 500 // 500MB max file size
    }
});

// Error handling middleware for multer
export const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size exceeds the 500MB limit'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
        });
    }
    next(err);
};
