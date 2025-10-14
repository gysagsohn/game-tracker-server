/**
 * Validate required environment variables on startup
 * Exits process if any required variables are missing
 */
function validateEnv() {
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "PORT",
    "FRONTEND_URL",
    "SERVER_URL",
    "EMAIL_FROM",
    "EMAIL_APP_PASSWORD",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET"
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error("\n❌ Missing required environment variables:");
    missing.forEach(key => console.error(`   - ${key}`));
    console.error("\nPlease add these to your .env file.\n");
    process.exit(1);
  }

  // Optional: warn about recommended but not critical variables
  const recommended = ["NODE_ENV"];
  const missingRecommended = recommended.filter(key => !process.env[key]);

  if (missingRecommended.length > 0) {
    console.warn("\n⚠️  Recommended environment variables missing (not critical):");
    missingRecommended.forEach(key => console.warn(`   - ${key}`));
    console.warn("");
  }

  console.log("✅ Environment variables validated\n");
}

module.exports = validateEnv;