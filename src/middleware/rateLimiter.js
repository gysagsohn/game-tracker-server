const makeLimiter = require("../utils/makeLimiter");
const { RATE_LIMIT } = require("../constants/limits");

// Auth operations (login, signup, password reset)
const authLimiter = makeLimiter({
  envPrefix: "AUTH",
  defaultMax: RATE_LIMIT.AUTH_MAX_REQUESTS,
  defaultWindowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  message: "Too many authentication requests. Please try again later.",
});

// Match/Session creation
const matchCreateLimiter = makeLimiter({
  envPrefix: "MATCH_CREATE",
  defaultMax: RATE_LIMIT.MATCH_CREATE_MAX,
  defaultWindowMs: RATE_LIMIT.MATCH_CREATE_WINDOW_MS,
  message: "Too many matches created. Please try again later.",
});

// Match reminders
const matchReminderLimiter = makeLimiter({
  envPrefix: "MATCH_REMINDER",
  defaultMax: RATE_LIMIT.MATCH_REMINDER_MAX,
  defaultWindowMs: RATE_LIMIT.MATCH_REMINDER_WINDOW_MS,
  message: "Too many reminders sent. Please try again later.",
});

// Search operations
const searchLimiter = makeLimiter({
  envPrefix: "SEARCH",
  defaultMax: RATE_LIMIT.SEARCH_MAX,
  defaultWindowMs: RATE_LIMIT.SEARCH_WINDOW_MS,
  message: "Too many search requests. Please slow down.",
});

// General API rate limit (fallback for unprotected routes)
const generalLimiter = makeLimiter({
  envPrefix: "GENERAL",
  defaultMax: RATE_LIMIT.GENERAL_MAX,
  defaultWindowMs: RATE_LIMIT.GENERAL_WINDOW_MS,
  message: "Too many requests. Please slow down.",
});

module.exports = {
  authLimiter,
  matchCreateLimiter,
  matchReminderLimiter,
  searchLimiter,
  generalLimiter,
};