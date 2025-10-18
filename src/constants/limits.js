/**
 * Application-wide limits and thresholds
 * Centralized to make configuration easier and prevent magic numbers
 */

module.exports = {
  // Rate limiting
  RATE_LIMIT: {
    // Auth endpoints (login, signup, password reset)
    AUTH_MAX_REQUESTS: 5,
    AUTH_WINDOW_MS: 10 * 60 * 1000, // 10 minutes
    
    // Friend request sending
    FRIEND_REQUEST_MAX: 5,
    FRIEND_REQUEST_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  },

  // Email rate limiting
  EMAIL: {
    GUEST_INVITES_PER_EMAIL_PER_DAY: 3,
    MATCH_REMINDER_COOLDOWN_MS: 6 * 60 * 60 * 1000, // 6 hours
  },

  // Data limits
  DATA: {
    ACTIVITY_LOG_MAX_ENTRIES: 100,
    SEARCH_RESULTS_MAX: 10,
    SEARCH_QUERY_MIN_LENGTH: 2,
  },
};