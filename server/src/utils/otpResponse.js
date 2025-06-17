export const genericPasswordResetResponse = (res) =>
  res
    .status(200)
    .json({ message: "If the email exists, an OTP has been sent." });
