// resetPassword.test.js
import express from "express";
import request from "supertest";
import {
  resetPasswordToken,
  resetPasword,
} from "../controllers/auth.controller.js";
import { User } from "../models/usersModels/user.model.js";
import { sendResetEmail } from "../utils/sendMail.js";

// Optional: Set global timeout for all tests (10 seconds)
jest.setTimeout(10000);

// Mock User and sendResetEmail properly
jest.mock("../models/user.model.js", () => ({
  User: {
    findOne: jest.fn(),
  },
}));

jest.mock("../utils/sendMail.js", () => ({
  sendResetEmail: jest.fn(),
}));

const app = express();
app.use(express.json());
app.post("/api/auth/reset-token", resetPasswordToken);
app.post("/api/auth/reset-password/:resetToken", resetPasword);

describe("Password Reset", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/reset-token", () => {
    it("should send reset link if user exists", async () => {
      const email = "test@example.com";

      const mockUser = {
        email,
        save: jest.fn(),
      };

      User.findOne.mockResolvedValue(mockUser);
      sendResetEmail.mockResolvedValue(); // Simulate success

      const res = await request(app)
        .post("/api/auth/reset-token")
        .send({ email });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Reset password link sent to your email");
      expect(mockUser.save).toHaveBeenCalled();
      expect(sendResetEmail).toHaveBeenCalledWith(
        email,
        expect.stringContaining("/reset-password/")
      );
    });

    it("should return 400 if user does not exist", async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/reset-token")
        .send({ email: "nonexistent@example.com" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("User does not exist");
    });
  });

  describe("POST /api/auth/reset-password/:resetToken", () => {
    it("should reset the password if token is valid and strong password", async () => {
      const mockUser = {
        resetPasswordToken: "123456",
        resetPasswordExpiresAt: Date.now() + 3600000,
        save: jest.fn(),
      };

      User.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/api/auth/reset-password/123456")
        .send({ newPassword: "StrongPass1!" });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Password reset successfully");
      expect(mockUser.password).toBe("StrongPass1!");
      expect(mockUser.resetPasswordToken).toBe("");
      expect(mockUser.resetPasswordExpiresAt).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should return 400 if token is invalid", async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/reset-password/invalidToken")
        .send({ newPassword: "StrongPass1!" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid or expired reset token");
    });

    it("should return 400 if password is weak", async () => {
      const mockUser = {
        resetPasswordToken: "123456",
        resetPasswordExpiresAt: Date.now() + 3600000,
        save: jest.fn(),
      };

      User.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/api/auth/reset-password/123456")
        .send({ newPassword: "weak" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("New password is not strong enough");
    });

    it("should return 400 if token has expired", async () => {
      const mockUser = {
        resetPasswordToken: "123456",
        resetPasswordExpiresAt: Date.now() - 1000,
        save: jest.fn(),
      };

      User.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/api/auth/reset-password/123456")
        .send({ newPassword: "StrongPass1!" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Reset token has expired");
    });
  });
});
