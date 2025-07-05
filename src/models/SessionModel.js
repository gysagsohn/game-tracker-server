const mongoose = require("mongoose");

// Embedded subdocument for individual scores
const scoreSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  score: {
    type: Number
  },
  outcome: {
    type: String,
    enum: ["Win", "Loss", "Draw"],
    required: true
  }
}, { _id: false });

// Main session schema
const sessionSchema = new mongoose.Schema({
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  playedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  scores: [scoreSchema],
  notes: {
    type: String
  }
}, {
  timestamps: true
});

const Session = mongoose.model("Session", sessionSchema);
module.exports = Session;
