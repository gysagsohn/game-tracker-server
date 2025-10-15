const mongoose = require("mongoose");
const NotificationTypes = require("../constants/notificationTypes"); // ensure this file name matches exactly

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

    // Preferred structured fields
    title: { type: String },         // UI-friendly title (optional)
    description: { type: String },   // UI-friendly body (optional)
    link: { type: String },          // optional deep link

    // Legacy HTML message (kept for backwards compatibility; optional)
    message: { type: String },

    // Match-related reference (optional)
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // adds createdAt / updatedAt
);

// Helpful indexes for faster list/unread queries
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);
