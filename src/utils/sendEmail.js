const { Resend } = require('resend');

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, text, html }) {
  // Validate required fields
  if (!to || !subject || (!text && !html)) {
    throw new Error('Missing required email fields: to, subject, and text/html');
  }

  try {
    const result = await resend.emails.send({
      from: 'Game Tracker <onboarding@resend.dev>', // Use Resend's test domain
      to,
      subject,
      text: text || '',
      html: html || text,
    });

    console.log(`✅ Email sent successfully to ${to} (ID: ${result.id})`);
    return result;
  } catch (error) {
    console.error('❌ Resend error:', {
      message: error.message,
      name: error.name,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

module.exports = sendEmail;