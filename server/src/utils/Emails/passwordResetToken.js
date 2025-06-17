export const resetPasswordHtml = (resetLink) => `
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
    .link {
      margin-top: 15px;
      word-break: break-all;
      font-size: 14px;
      color: #007bff;
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
    <p>Click the button below to set a new password:</p>
    <a class="btn" href="${resetLink}">Reset Password</a>

    <p class="link">
      Or copy and paste this link in your browser:<br />
      <a href="${resetLink}">${resetLink}</a>
    </p>

    <p>If you didn't request this, ignore this email.</p>
    <p class="footer">© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
  </div>
</body>
</html>
`;
