const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Subdocument for friend requests
const friendRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending"
  }
}, { _id: false });

// Main User schema
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String }, // Required only for "local" users
  authProvider: {
    type: String,
    enum: ["local", "google", "facebook"],
    default: "local"
  },
  profileIcon: { type: String }, // DiceBear URL

  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  friendRequests: [friendRequestSchema],

  stats: {
    wins:        { type: Number, default: 0 },
    losses:      { type: Number, default: 0 },
    mostPlayed:  { type: String, default: "" }
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving (only if modified and provider is local)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.authProvider !== "local") return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method for login
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
