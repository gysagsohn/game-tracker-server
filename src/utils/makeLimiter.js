const rateLimit = require("express-rate-limit");

/**
 * Create an express-rate-limit instance with optional environment overrides.
 * Max and window can be overridden per-environment via:
 *   ${envPrefix}_RATE_MAX and ${envPrefix}_RATE_WINDOW_MS
 *
 * The handler option is used for the 429 response — the message property
 * on the rateLimit constructor is intentionally omitted because the handler
 * overrides it anyway, and having both is confusing.
 *
 * @param {Object} opts
 * @param {string} opts.envPrefix - e.g. "AUTH", "FRIEND"
 * @param {number} opts.defaultMax
 * @param {number} opts.defaultWindowMs
 * @param {string} opts.message - human-readable error sent in the 429 response
 */
function makeLimiter({ envPrefix, defaultMax, defaultWindowMs, message }) {
  const max = Number(process.env[`${envPrefix}_RATE_MAX`]) || defaultMax;
  const windowMs = Number(process.env[`${envPrefix}_RATE_WINDOW_MS`]) || defaultWindowMs;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // handler replaces the default rateLimit response — no need to also pass message
    handler: (req, res) => {
      res.status(429).json({ message });
    },
  });
}

module.exports = makeLimiter;