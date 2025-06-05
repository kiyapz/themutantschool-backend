import express from "express";
import request from "supertest";
import multer from "multer";
import path from "path";
import fs from "fs";

// === MOCK DEPENDENCIES ===
jest.mock("fs", () => {
  const actualFs = jest.requireActual("fs");
  return {
    ...actualFs,
    unlinkSync: jest.fn(), // only unlinkSync is mocked
  };
});

jest.mock("argon2", () => ({
  hash: jest.fn(() => "mockedHash"),
  verify: jest.fn(() => true),
}));

jest.mock("../models/user.model.js", () => ({
  User: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock("../config/cloudinary.js", () => ({
  uploadsToCloudinary: jest.fn(() => ({
    secure_url: "http://mocked-url.com/fake.jpg",
    public_id: "mockedPublicId",
  })),
  deleteFromCloudinary: jest.fn(),
}));

// === IMPORT ACTUAL MODULES ===
import { User } from "../models/user.model.js";
import {
  getAllUsers,
  getUserById,
  updateUserProfile,
  deleteUser,
} from "../controllers/user.controller.js";
import {
  uploadsToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

// === EXPRESS SETUP ===
const app = express();
app.use(express.json());
const upload = multer({ dest: "uploads/" });
app.get("/api/users", getAllUsers);
app.get("/api/users/:id", getUserById);
app.put("/api/users/:id", upload.single("avatar"), updateUserProfile);
app.delete("/api/users/:id", deleteUser);

// === MOCK HELPER ===
const mockSelect = (data) => ({
  select: jest.fn().mockResolvedValue(data),
});

// === TESTS ===
describe("User Controller Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/users", () => {
    it("should return all users", async () => {
      const mockUsers = [{ _id: "1", username: "user1" }];
      User.find.mockReturnValue(mockSelect(mockUsers));

      const res = await request(app).get("/api/users");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockUsers);
    });

    it("should return 404 when no users found", async () => {
      User.find.mockReturnValue(mockSelect([]));

      const res = await request(app).get("/api/users");

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("No users found");
    });
  });

  describe("GET /api/users/:id", () => {
    it("should return a user by ID", async () => {
      const user = { _id: "1", username: "user1" };
      User.findById.mockReturnValue(mockSelect(user));

      const res = await request(app).get("/api/users/1");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(user);
    });

    it("should return 404 if user not found", async () => {
      User.findById.mockReturnValue(mockSelect(null));

      const res = await request(app).get("/api/users/999");

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("User not found");
    });
  });

  describe("PUT /api/users/:id", () => {
    it("should update user fields without avatar", async () => {
      const user = {
        _id: "1",
        firstName: "Old",
        save: jest.fn(),
        avatar: {},
      };
      User.findById.mockResolvedValue(user);

      const res = await request(app)
        .put("/api/users/1")
        .send({ firstName: "New" });

      expect(res.statusCode).toBe(200);
      expect(user.firstName).toBe("New");
      expect(user.save).toHaveBeenCalled();
    });

    it("should reject password update via this route", async () => {
      const user = { _id: "1" };
      User.findById.mockResolvedValue(user);

      const res = await request(app)
        .put("/api/users/1")
        .send({ password: "notAllowed" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe(
        "Use the dedicated password update endpoint"
      );
    });

    it("should return 404 if user to update is not found", async () => {
      User.findById.mockResolvedValue(null);

      const res = await request(app).put("/api/users/999").send({});

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
    // it("should update avatar and cleanup old image", async () => {
    //   const user = {
    //     _id: "1",
    //     save: jest.fn(),
    //     avatar: { publicId: "oldImageId" },
    //   };
    //   User.findById.mockResolvedValue(user);

    //   const assetsDir = path.join(__dirname, "assets");
    //   const avatarPath = path.join(assetsDir, "avatar.jpg");

    //   // Create the assets directory if it doesn't exist
    //   if (!fs.existsSync(assetsDir)) {
    //     fs.mkdirSync(assetsDir);
    //   }

    //   // Write dummy content to avatar.jpg if the file doesn't exist
    //   if (!fs.existsSync(avatarPath)) {
    //     fs.writeFileSync(avatarPath, "dummy content");
    //   }

    //   const res = await request(app)
    //     .put("/api/users/1")
    //     .field("firstName", "Updated")
    //     .attach("avatar", avatarPath);

    //   expect(res.statusCode).toBe(200);
    //   expect(user.firstName).toBe("Updated");
    //   expect(deleteFromCloudinary).toHaveBeenCalledWith("oldImageId");
    //   expect(uploadsToCloudinary).toHaveBeenCalled();
    //   expect(fs.unlinkSync).toHaveBeenCalledWith(
    //     expect.stringContaining("uploads/")
    //   );
    //   expect(user.save).toHaveBeenCalled();
    // });
  });

  describe("DELETE /api/users/:id", () => {
    it("should delete a user", async () => {
      User.findByIdAndDelete.mockResolvedValue({ _id: "1" });

      const res = await request(app).delete("/api/users/1");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("User deleted successfully");
    });

    it("should return 404 if user not found for deletion", async () => {
      User.findByIdAndDelete.mockResolvedValue(null);

      const res = await request(app).delete("/api/users/999");

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("User not found");
    });
  });
});
