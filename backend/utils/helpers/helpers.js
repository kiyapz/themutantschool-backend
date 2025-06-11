// Helper to generate 6-digit OTP token
export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Helper for token expiry time (1 hour from now)
export const tokenExpiry = () => Date.now() + 60 * 60 * 1000;

// Centralized error response for validation errors
export const handleValidationError = (res, error) =>
  res.status(400).json({ success: false, message: error.details[0].message });

// Centralized generic response for password reset request
export const genericPasswordResetResponse = (res) =>
  res
    .status(200)
    .json({ message: "If the email exists, an OTP has been sent." });
