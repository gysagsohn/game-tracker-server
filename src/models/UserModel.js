const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { friendRequestSchema } = require("./subdocuments/FriendRequestSchema");

// Main user schema
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },

  isEmailVerified: {
  type: Boolean,
  default: false
  },

  resetPasswordToken: {
  type: String,
  },

  resetPasswordExpires: {
  type: Date,
  },
  
  password: {
    type: String // Required only if authProvider is 'local'
  },
  authProvider: {
    type: String,
    enum: ["local", "google", "facebook"],
    default: "local"
  },
  profileIcon: {
    type: String // DiceBear URL or frontend-generated
  },

  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  friendRequests: [friendRequestSchema],

  stats: {
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    mostPlayed: {
      type: String,
      default: ""
    }
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  isSuspended: {
  type: Boolean,
  },

  notifications: [
    {
      type: {
        type: String,
        enum: ["friend_request", "friend_accept", "info"],
        required: true
      },
      from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      message: String,
      isRead: { type: Boolean, default: false },
      date: { type: Date, default: Date.now }
    }
  ],

    activityLogs: [
    {
      action: {
        type: String,
        required: true
      },
      metadata: {
        type: mongoose.Schema.Types.Mixed
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],


});

// Hash password before saving (only if local and changed)
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

// Method to compare raw and hashed password
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
