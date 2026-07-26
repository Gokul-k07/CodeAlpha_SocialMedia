import nodemailer from 'nodemailer';

const createTransporter = () => {
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT) || 587;
  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASS;

  if (!user || !pass) {
    console.warn('[EMAIL SERVICE WARNING] BREVO_SMTP_USER or BREVO_SMTP_PASS is not configured in process.env');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: false, // 587 uses STARTTLS
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Sends a GOsocial branded Password Reset Email via Brevo SMTP
 * @param {Object} params
 * @param {string} params.email - Recipient email address
 * @param {string} [params.name] - Recipient full name
 * @param {string} params.resetUrl - Full password reset URL containing token
 */
export const sendPasswordResetEmail = async ({ email, name, resetUrl }) => {
  const transporter = createTransporter();
  const fromName = process.env.BREVO_FROM_NAME || 'GOsocial';
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'gokul.btech2428@gmail.com';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your GOsocial Password</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .brand { font-size: 24px; font-weight: 800; color: #38bdf8; text-decoration: none; margin-bottom: 24px; display: inline-block; }
        .title { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 16px; }
        .text { font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
        .btn-container { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #0F2573, #266CA9); color: #ffffff !important; font-weight: 700; font-size: 16px; padding: 14px 28px; text-decoration: none; border-radius: 9999px; box-shadow: 0 4px 12px rgba(38,108,169,0.4); }
        .footer { font-size: 13px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 20px; margin-top: 32px; }
        .link-alt { word-break: break-all; color: #38bdf8; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="brand">GOsocial</a>
        <h1 class="title">Password Reset Request</h1>
        <p class="text">Hello ${name || 'there'},</p>
        <p class="text">We received a request to reset the password for your GOsocial account. Click the button below to choose a new password:</p>
        <div class="btn-container">
          <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
        </div>
        <p class="text">This password reset link will expire in <strong>15 minutes</strong> for your security. If you did not request a password reset, you can safely ignore this email and your password will remain unchanged.</p>
        <div class="footer">
          <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
          <p><a href="${resetUrl}" class="link-alt">${resetUrl}</a></p>
          <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} GOsocial. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textFallback = `Hello ${name || 'there'},\n\nWe received a request to reset your GOsocial password.\n\nPlease use the following link to reset your password:\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\n— GOsocial Team`;

  return await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: 'Reset your GOsocial password',
    text: textFallback,
    html: htmlContent,
  });
};
