
const mongoose = require("mongoose");
const Session = require("../src/models/SessionModel");
const Game = require("../src/models/GameModel");

(async () => {
  await mongoose.connect(process.env.DATABASE_URL);
  const sessions = await Session.find().select("_id game");
  let orphans = [];
  for (const s of sessions) {
    if (!s.game) { orphans.push(s._id); continue; }
    const exists = await Game.exists({ _id: s.game });
    if (!exists) orphans.push(s._id);
  }
  console.log("Orphan sessions:", orphans.length, orphans);
  await mongoose.disconnect();
})();
