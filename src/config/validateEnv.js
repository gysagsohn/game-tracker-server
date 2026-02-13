/**
 * Validate required environment variables on startup
 * Exits process if any required variables are missing
 */
require('dotenv').config();

function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'RESEND_API_KEY',
    'FRONTEND_URL',
    'SERVER_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }

  console.log('Environment variables validated');
}

module.exports = validateEnv;
