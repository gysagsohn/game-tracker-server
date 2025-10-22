// src/utils/sendEmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
  // Add timeout and connection pooling
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  pool: true,
  maxConnections: 5,
});
/**
 * Send an email and return { ok: boolean, error?: string }
 */
async function sendEmail(to, subject, html) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { ok: true };
  } catch (error) {
    console.error("Email send failed:", error.message);
    return { ok: false, error: error.message };
  }
}

module.exports = sendEmail;
