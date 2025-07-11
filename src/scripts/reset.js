require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/UserModel");
const Game = require("../models/GameModel");
const Session = require("../models/SessionModel");
const Notification = require("../models/NotificationModel");

async function resetDatabase() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("Connected to MongoDB");

    await User.deleteMany({});
    await Game.deleteMany({});
    await Session.deleteMany({});
    await Notification.deleteMany({});

    console.log("All collections wiped.");
    process.exit(0);
  } catch (err) {
    console.error("Error resetting database:", err);
    process.exit(1);
  }
}

resetDatabase();
