const rateLimit = require("express-rate-limit");

/**
 * Create an express-rate-limit instance with environment overrides.
 * @param {Object} opts
 * @param {string} opts.envPrefix - e.g. "AUTH" -> AUTH_RATE_MAX, AUTH_RATE_WINDOW_MS
 * @param {number} opts.defaultMax
 * @param {number} opts.defaultWindowMs
 * @param {string} opts.message
 */
function makeLimiter({ envPrefix, defaultMax, defaultWindowMs, message }) {
  const max = Number(process.env[`${envPrefix}_RATE_MAX`]) || defaultMax;
  const windowMs =
    Number(process.env[`${envPrefix}_RATE_WINDOW_MS`]) || defaultWindowMs;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

module.exports = makeLimiter;
