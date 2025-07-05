const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },

  description: {
    type: String
  },

  category: {
    type: String,
    enum: ["Card", "Board", "Dice", "Word", "Strategy", "Trivia", "Party", "Other"],
    default: "Other"
  },

  // Optional field if category is "Other"
  customCategory: {
    type: String,
    default: ""
  },

  maxPlayers: {
    type: Number
  },

  minPlayers: {
    type: Number
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  isCustom: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Game = mongoose.model("Game", gameSchema);
module.exports = Game;
