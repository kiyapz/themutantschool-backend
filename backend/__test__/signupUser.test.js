import express from "express";
import { User } from "../models/user.model.js";
import { signUpUser } from "../controllers/auth.controller.js";
import { uploadsToCloudinary } from "../config/cloudinary.js";
import { generateTokens } from "../utils/generateTokens.js";
import { sendVerificationEmail } from "../utils/sendMail.js";
import request from "supertest";
//creating a test app
const app = express();
app.use(express.json());
app.post("/api/auth/signup", signUpUser);
//mock
jest.mock("../models/user.model.js");
jest.mock("../config/cloudinary.js");
jest.mock("../utils/generateTokens.js");
jest.mock("../utils/sendMail.js");

describe("POST/api/auth/signup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("It should signup new user successfully", async () => {
    //fake user
    const userData = {
      email: "joy@gmail.com",
      firstName: "joy",
      lastName: "Peter",
      username: "Joy1",
      password: "1234567890",
    };
    //mock no existing user
    User.findOne.mockResolvedValue(null);
    //mock user.save
    const saveMock = jest.fn();
    User.mockImplementation(() => ({
      save: saveMock,
      _id: "fackid123",
    }));
    //mock cloudinary upload
    uploadsToCloudinary.mockResolvedValue({
      secure_url: "https://cloudinary.com/fakeImage.jpg",
      public_id: "public12347",
    });
    //mock token generation
    generateTokens.mockResolvedValue({
      accessToken: "acess12345",
      refreshToken: "refreshToken1239",
    });
    sendVerificationEmail.mockResolvedValue();
    const res = await request(app).post("/api/auth/signup").send(userData);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("User registered successfully");
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(saveMock).toHaveBeenCalled();
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      userData.email,
      expect.any(String)
    );
  });
  it("should return 400 if user already exists", async () => {
    User.findOne.mockResolvedValue({}); // user exists

    const res = await request(app).post("/api/auth/signup").send({
      email: "test@example.com",
      name: "Test User",
      username: "testuser",
      password: "Password123!",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User already exists");
  });
});
