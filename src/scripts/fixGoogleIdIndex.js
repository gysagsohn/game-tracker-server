require("dotenv").config();
const mongoose = require("mongoose");

async function fixIndex() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    // List all indexes
    const indexes = await collection.indexes();
    console.log("Current indexes:", indexes.map(i => i.name));

    // Drop the duplicate googleId index if it exists
    try {
      await collection.dropIndex("googleId_1");
      console.log("Dropped old googleId_1 index");
    } catch (err) {
      console.log("No googleId_1 index to drop (or already dropped)");
    }

    // The correct index will be recreated automatically on next server start
    console.log("Index fixed. Restart your server to recreate the correct index.");

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

fixIndex();