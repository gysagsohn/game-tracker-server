const nodemailer = require("nodemailer");

// Setup SMTP transporter using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM,        // Gmail address
    pass: process.env.EMAIL_APP_PASSWORD // Gmail app password (app-specific)
  }
});

/**
 * Send an email and return { ok: boolean, error?: string }
 */
async function sendEmail(to, subject, html) {
  const mailOptions = { from: process.env.EMAIL_FROM, to, subject, html };

  try {
    await transporter.sendMail(mailOptions);
    return { ok: true };
  } catch (error) {
    console.error("Email send failed:", error?.message || error);
    return { ok: false, error: error?.message || String(error) };
  }
}

module.exports = sendEmail;
