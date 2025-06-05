import express from "express";
import request from "supertest";

import { User } from "../models/user.model.js";
import { verifyAccount } from "../controllers/auth.controller.js";

// Create app
const app = express();
app.use(express.json());
app.post("/api/auth/verify", verifyAccount);

//mock
jest.mock("../models/user.model.js");

describe("POST /api/auth/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should verify account successfully", async () => {
    const fakeUser = {
      email: "joy@gmail.com",
      isVerified: false,
      verificationToken: "123456",
      verificationTokenExpiresAt: Date.now() + 10000,
      save: jest.fn(),
      _id: "verified123",
    };

    User.findOne.mockResolvedValue(fakeUser);

    const res = await request(app).post("/api/auth/verify").send({
      email: "joy@gmail.com",
      token: "123456",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Account verified successfully");
    expect(fakeUser.isVerified).toBe(true);
    expect(fakeUser.verificationToken).toBe("");
    expect(fakeUser.save).toHaveBeenCalled();
  });

  it("should return 400 if token is invalid", async () => {
    const fakeUser = {
      email: "joy@gmail.com",
      isVerified: false,
      verificationToken: "654321",
      verificationTokenExpiresAt: Date.now() + 10000,
      save: jest.fn(),
    };

    User.findOne.mockResolvedValue(fakeUser);

    const res = await request(app).post("/api/auth/verify").send({
      email: "joy@gmail.com",
      token: "wrong-token",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid or expired token");
  });

  it("should return 400 if token is expired", async () => {
    const fakeUser = {
      email: "joy@gmail.com",
      isVerified: false,
      verificationToken: "123456",
      verificationTokenExpiresAt: Date.now() - 10000,
      save: jest.fn(),
    };

    User.findOne.mockResolvedValue(fakeUser);

    const res = await request(app).post("/api/auth/verify").send({
      email: "joy@gmail.com",
      token: "123456",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid or expired token");
  });

  it("should return 404 if user not found", async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).post("/api/auth/verify").send({
      email: "nonexistent@gmail.com",
      token: "123456",
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  it("should return 400 if already verified", async () => {
    const fakeUser = {
      email: "joy@gmail.com",
      isVerified: true,
      verificationToken: "123456",
      verificationTokenExpiresAt: Date.now() + 10000,
      save: jest.fn(),
    };

    User.findOne.mockResolvedValue(fakeUser);

    const res = await request(app).post("/api/auth/verify").send({
      email: "joy@gmail.com",
      token: "123456",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Account already verified");
  });
});
