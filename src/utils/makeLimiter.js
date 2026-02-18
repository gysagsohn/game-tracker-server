// src/utils/makeLimiter.js - UPDATE

const rateLimit = require("express-rate-limit");

/**
 * Create an express-rate-limit instance with environment overrides.
 * @param {Object} opts
 * @param {string} opts.envPrefix
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
    message: { message }, 
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ message });
    }
  });
}

module.exports = makeLimiter;