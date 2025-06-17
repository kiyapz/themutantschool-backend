import nodemailer from "nodemailer";
import { verificationHtml } from "./emailVerification.js";
import { logger } from "./logger.js";
import { resetPasswordHtml } from "./passwordResetToken.js";
export const sendVerificationEmail = async (email, verificationToken) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Email Verification Code",
      html: verificationHtml(verificationToken),
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info("Email sent: " + info.response);
    return info;
  } catch (error) {
    logger.warn("Error sending email:", error);
    throw error;
  }
};

//reset password
export const sendResetEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Your Password",
      html: resetPasswordHtml(otp),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return info;
  } catch (error) {
    console.error("Error sending reset password email:", error);
    throw error;
  }
};
