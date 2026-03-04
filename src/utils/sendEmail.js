const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a transactional email via the Resend API.
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html - HTML email body
 * @returns {Promise<{ ok: boolean, id?: string, error?: string }>}
 */
async function sendEmail(to, subject, html) {
  try {
    // Guard: all three parameters are required
    if (!to || !subject || !html) {
      console.error("sendEmail: Missing required parameters");
      return { ok: false, error: "Missing required parameters" };
    }

    // Guard: Resend must be configured
    if (!process.env.RESEND_API_KEY) {
      console.error("sendEmail: RESEND_API_KEY not configured");
      return { ok: false, error: "Email service not configured" };
    }

    const result = await resend.emails.send({
      from: "Keep Track <notice@keeptrack.online>",
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error("Resend API error:", result.error);
      return { ok: false, error: result.error.message || "Failed to send email" };
    }

    return { ok: true, id: result.data?.id };
  } catch (error) {
    console.error("sendEmail error:", error);
    return { ok: false, error: error.message || "Email sending failed" };
  }
}

module.exports = sendEmail;