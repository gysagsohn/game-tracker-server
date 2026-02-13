const mongoose = require("mongoose");
const NotificationTypes = require("../constants/notificationTypes");

const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(NotificationTypes),
      required: true,
    },

    // Message content
    message: { 
      type: String,
      required: true 
    },

    // Match-related reference (using 'session' to match frontend)
    session: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },

    // Read status (using 'read' to match frontend)
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // adds createdAt / updatedAt
);

// Helpful indexes for faster list/unread queries
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);