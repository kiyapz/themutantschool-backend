export const resetPasswordHtml = (resetToken) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Password</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
        text-align: center;
      }
      .container {
        max-width: 600px;
        margin: 20px auto;
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
      }
      .btn {
        display: inline-block;
        padding: 12px 20px;
        margin-top: 20px;
        background-color: #dc3545;
        color: #fff;
        text-decoration: none;
        border-radius: 5px;
        font-size: 16px;
      }
      .footer {
        margin-top: 20px;
        font-size: 12px;
        color: #888;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Reset Your Password</h2>
      <p>You have requested to reset your password. Click the button below to set a new password:</p>
      <a class="btn" href="${
        process.env.CLIENT_URL
      }/reset-password/${resetToken}">
        Reset Password
      </a>
      <p>If you did not request a password reset, please ignore this email.</p>
      <p class="footer">© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
    </div>
  </body>
  </html>
`;
