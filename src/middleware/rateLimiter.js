const rateLimit = require("express-rate-limit");

// Limit for auth routes (max 5 per 10 mins per IP)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: "Too many requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = authLimiter;