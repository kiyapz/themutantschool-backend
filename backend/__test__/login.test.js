import express from "express";
import request from "supertest";
import { loginUser, logOut } from "../controllers/auth.controller.js";
import { User } from "../models/user.model.js";
import { generateTokens } from "../utils/generateTokens.js";
import { RefreshToken } from "../models/refreshToken.model.js";

// Create test app
const app = express();
app.use(express.json());
app.post("/api/auth/login", loginUser);
app.post("/api/auth/logout", logOut);

// Mock modules
jest.mock("../models/user.model.js");
jest.mock("../utils/generateTokens.js");
jest.mock("../models/refreshToken.model.js");

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should login a user successfully", async () => {
    const mockUser = {
      _id: "user123",
      email: "test@example.com",
      password: "Password123!",
      comparePassword: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(mockUser);
    generateTokens.mockResolvedValue({
      accessToken: "access123",
      refreshToken: "refresh123",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "Password123!",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("User logged in successfully");
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(mockUser.comparePassword).toHaveBeenCalledWith("Password123!");
  });

  it("should return 404 if user not found", async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).post("/api/auth/login").send({
      email: "notfound@example.com",
      password: "any1111111",
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User not found");
  });

  it("should return 400 for invalid password", async () => {
    const mockUser = {
      email: "test@example.com",
      comparePassword: jest.fn().mockResolvedValue(false),
    };

    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "wrongpassword",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid credentials");
  });
});

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should logout a user and delete refresh token", async () => {
    const token = "refresh123";
    RefreshToken.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const res = await request(app).post("/api/auth/logout").send({
      refreshToken: token,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("User logged out successfully");
    expect(RefreshToken.deleteOne).toHaveBeenCalledWith({ token });
  });

  it("should return 400 if refresh token is missing", async () => {
    const res = await request(app).post("/api/auth/logout").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Refresh token is missing");
  });
});
