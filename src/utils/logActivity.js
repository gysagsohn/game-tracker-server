const User = require("../models/UserModel");

async function logUserActivity(userId, action, metadata = {}) {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        activityLogs: {
          action,
          metadata,
          createdAt: new Date()
        }
      }
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

module.exports = logUserActivity;
