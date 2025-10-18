const User = require("../models/UserModel");
const { DATA } = require("../constants/limits"); 

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
          $slice: -DATA.ACTIVITY_LOG_MAX_ENTRIES
        } 
      }
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

module.exports = logUserActivity;