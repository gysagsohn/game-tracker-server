const makeLimiter = require("../utils/makeLimiter");
const { RATE_LIMIT } = require("../constants/limits");

const authLimiter = makeLimiter({
  envPrefix: "AUTH",
  defaultMax: RATE_LIMIT.AUTH_MAX_REQUESTS,
  defaultWindowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  message: "Too many requests. Please try again later.",
});

module.exports = authLimiter;