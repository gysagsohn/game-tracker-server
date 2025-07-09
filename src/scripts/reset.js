const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { databaseConnect, databaseClose } = require("../config/database");

dotenv.config();

async function resetDatabase() {
  await databaseConnect();

  try {
    await mongoose.connection.dropDatabase();
    console.log("💣 All collections dropped. DB reset complete.");
  } catch (err) {
    console.error("❌ Reset error:", err);
  } finally {
    await databaseClose();
  }
}

resetDatabase();
