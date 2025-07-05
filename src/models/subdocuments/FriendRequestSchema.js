const mongoose = require("mongoose");

const friendRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending"
  }
}, { _id: false });

module.exports = { friendRequestSchema };
