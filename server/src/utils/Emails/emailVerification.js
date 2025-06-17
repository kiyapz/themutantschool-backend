export const verificationHtml = (verificationToken) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
                text-align: center;
            }
            .container {
                width: 100%;
                max-width: 600px;
                margin: 20px auto;
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
            }
            h2 {
                color: #333;
            }
            p {
                font-size: 16px;
                color: #555;
            }
            .token-box {
                font-size: 24px;
                font-weight: bold;
                background-color: #007bff;
                color: #fff;
                display: inline-block;
                padding: 10px 20px;
                border-radius: 5px;
                margin-top: 15px;
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
            <h2>Email Verification</h2>
            <p>Thank you for signing up! Use the code below to verify your email:</p>
            <div class="token-box">${verificationToken}</div>
            <p>If you did not request this, please ignore this email.</p>
            <p class="footer">© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
        </div>
    </body>
    </html>
`;
