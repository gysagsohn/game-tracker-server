const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null // null for guest players
  },
  
  name: {
    type: String,
    required: true
  },

  email: {
    type: String
  },

  score: {
    type: Number
  },

  result: {
    type: String,
    enum: ["Win", "Loss", "Draw"]
  },

  confirmed: {
    type: Boolean,
    default: true // guests are auto-confirmed
  },

  invited: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
    required: true
  },

  players: [playerSchema], // replaces playedBy + scores
  notes: {
    type: String
  },

  matchStatus: {
    type: String,
    enum: ["Pending", "Confirmed"],
    default: "Pending"
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  date: {
    type: Date,
    default: Date.now
  },

  lastReminderSent: {
  type: Date,
  default: null
  },

}, {
  timestamps: true
});

const Session = mongoose.model("Session", sessionSchema);
module.exports = Session;
