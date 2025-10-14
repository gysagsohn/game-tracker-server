require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/UserModel");
const Session = require("../models/SessionModel");

async function checkIndexes() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("Connected to MongoDB\n");

    // Check User indexes
    const userIndexes = await User.collection.getIndexes();
    console.log("User indexes:");
    Object.keys(userIndexes).forEach(key => {
      console.log(`  - ${key}`);
    });

    // Check Session indexes
    const sessionIndexes = await Session.collection.getIndexes();
    console.log("\nSession indexes:");
    Object.keys(sessionIndexes).forEach(key => {
      console.log(`  - ${key}`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkIndexes();