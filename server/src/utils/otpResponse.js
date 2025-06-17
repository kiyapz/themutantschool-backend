// utils/otpResponse.js
export const genericPasswordResetResponse = () => {
  return {
    status: 200,
    success: true,
    message: "If the email exists, an OTP has been sent.",
  };
};
