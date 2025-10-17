// src/utils/sendEmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
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
