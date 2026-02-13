require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env.development'
});

const validateEnv = require("./config/validateEnv");
validateEnv();

const { app } = require("./server.js");
const { databaseConnect } = require("./config/database.js");

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await databaseConnect(); // ensure DB is up first
    app.listen(PORT, () => {
      console.log(`Game Tracker API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err?.message || err);
    process.exit(1);
  }
})();
