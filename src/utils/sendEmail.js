const nodemailer = require("nodemailer");

// Setup SMTP transporter using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM,         // Your Gmail address
    pass: process.env.EMAIL_APP_PASSWORD  // Gmail app password (not regular password)
  }
});

// Main function to send emails
async function sendEmail(to, subject, html) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html
  };

  // Send the email
  try {
  await transporter.sendMail(mailOptions);  
  } catch (error) {
  console.error("Email send failed:", error.message);
  }
}

module.exports = sendEmail;
