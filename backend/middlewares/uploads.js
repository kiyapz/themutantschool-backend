import multer from "multer";

// Use memory storage instead of disk
const storage = multer.memoryStorage();

// File filter function
const checkFileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed!"));
  }
};

// Multer middleware
export const upload = multer({
  storage,
  fileFilter: checkFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
});
