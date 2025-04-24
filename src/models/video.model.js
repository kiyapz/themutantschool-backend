// src/models/video.model.js
import mongoose from "mongoose";

const renditionSchema = new mongoose.Schema({
  name: String,
  resolution: String,
  videoBitrate: String,
  audioBitrate: String,
  path: String
}, { _id: false });

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  filename: {
    type: String,
    required: true
  },
  originalPath: {
    type: String
  },
  processedPath: {
    type: String
  },
  hlsPath: {
    type: String
  },
  thumbnailPath: {
    type: String
  },
  thumbnailUrl: {
    type: String
  },
  duration: {
    type: Number
  },
  resolution: {
    width: Number,
    height: Number
  },
  renditions: [renditionSchema],
  status: {
    type: String,
    enum: ["UPLOADED", "PROCESSING", "PROCESSED", "PUBLISHED", "FAILED"],
    default: "UPLOADED"
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  history: [{
    status: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  processingStats: {
    startTime: Date,
    endTime: Date,
    duration: Number, // Store the duration directly, calculate it elsewhere
    success: Boolean,
    error: String
  }
}, { timestamps: true });

// Add text index for search
videoSchema.index({ title: 'text', description: 'text' });

const Video = mongoose.model("Video", videoSchema);

export default Video;
