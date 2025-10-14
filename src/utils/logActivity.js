const User = require("../models/UserModel");

/**
 * Log user activity
 * Keeps only the last 100 entries per user to prevent unbounded growth
 */
async function logUserActivity(userId, action, metadata = {}) {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        activityLogs: {
          $each: [{
            action,
            metadata,
            createdAt: new Date()
          }],
          $slice: -100 // Keep only the last 100 entries
        }
      }
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

module.exports = logUserActivity;