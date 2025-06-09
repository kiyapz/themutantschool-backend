export const resetPasswordHtml = (otp) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <!-- your styles unchanged -->
  </head>
  <body>
    <div class="container">
      <h2>Reset Your Password</h2>
      <p>You have requested to reset your password. Use the following OTP to reset your password:</p>
      <h1 style="font-size: 32px; color: #dc3545; margin: 20px 0;">${otp}</h1>
      <p>If you did not request a password reset, please ignore this email.</p>
      <p class="footer">© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
    </div>
  </body>
  </html>
`;
