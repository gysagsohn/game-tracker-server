const makeLimiter = require("../utils/makeLimiter");

const authLimiter = makeLimiter({
  envPrefix: "AUTH",
  defaultMax: 5,
  defaultWindowMs: 10 * 60 * 1000,
  message: "Too many requests. Please try again later.",
});

module.exports = authLimiter;