const mongoose = require("mongoose");
const NotificationTypes = require("../constants/notificationTypes");

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sender:    { type: Schema.Types.ObjectId, ref: "User", default: null },
    type: {
      type: String,
      enum: Object.values(NotificationTypes),
      required: true,
    },
    message:  { type: String, required: true },
    // Match reference — named 'session' to match frontend field naming
    session:  { type: Schema.Types.ObjectId, ref: "Session", default: null },
    read:     { type: Boolean, default: false },
  },
  { timestamps: true } // adds createdAt / updatedAt
);

// Automatically delete notifications older than 90 days.
// MongoDB's TTL background job runs approximately once per minute,
// so deletion may lag slightly behind the exact expiry time — this is expected.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

// Fast lookups for the recipient's notification feed
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;