const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @returns {Promise<{ok: boolean, id?: string, error?: string}>}
 */
async function sendEmail(to, subject, html) {
  try {
    // Validate inputs
    if (!to || !subject || !html) {
      console.error("sendEmail: Missing required parameters");
      return { ok: false, error: "Missing required parameters" };
    }

    // Validate API key exists
    if (!process.env.RESEND_API_KEY) {
      console.error("sendEmail: RESEND_API_KEY not configured");
      return { ok: false, error: "Email service not configured" };
    }

    // ADD THIS - Log the API key (first 10 chars only for security)
    const keyPreview = process.env.RESEND_API_KEY.substring(0, 10) + "...";
    console.log(`🔑 Using Resend API key: ${keyPreview}`);
    console.log(`📧 Sending email to: ${to}`);
    console.log(`📝 Subject: ${subject}`);

    // Send email via Resend
    const result = await resend.emails.send({
      from: "Game Tracker <notice@keeptrack.online>", // Update with your verified domain
      to,
      subject,
      html,
    });

    // STANDARDIZED RESPONSE FORMAT
    if (result.error) {
      console.error("Resend API error:", result.error);
      return { ok: false, error: result.error.message || "Failed to send email" };
    }

    // Success
    return { ok: true, id: result.data?.id };
  } catch (error) {
    console.error("sendEmail error:", error);
    return { ok: false, error: error.message || "Email sending failed" };
  }
}

module.exports = sendEmail;