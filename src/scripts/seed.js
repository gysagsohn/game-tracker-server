const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Game = require("../models/GameModel");
const { databaseConnect, databaseClose } = require("../config/database");

dotenv.config();

async function seed() {
  await databaseConnect();

  // Only seed games 
  const standardGames = [
    {
      name: "Monopoly Deal",
      category: "Card",
      minPlayers: 2,
      maxPlayers: 5,
      isCustom: false
    },
    {
      name: "Catan",
      category: "Board",
      minPlayers: 3,
      maxPlayers: 4,
      isCustom: false
    },
    {
      name: "Phase 10",
      category: "Card",
      minPlayers: 2,
      maxPlayers: 6,
      isCustom: false
    },
    {
      name: "Skip-Bo",
      category: "Card",
      minPlayers: 2,
      maxPlayers: 6,
      isCustom: false
    },
    {
      name: "Uno",
      category: "Card",
      minPlayers: 2,
      maxPlayers: 10,
      isCustom: false
    },
    {
      name: "Codenames",
      category: "Word",
      minPlayers: 4,
      maxPlayers: 8,
      isCustom: false
    }
  ];

  for (let game of standardGames) {
    const exists = await Game.findOne({ name: game.name });
    if (!exists) {
      await Game.create(game);
      console.log(`Seeded game: ${game.name}`);
    } else {
      console.log(`Game already exists: ${game.name}`);
    }
  }

  await databaseClose();
  console.log("🌱 Game seeding complete (admin user removed).");
}

seed().catch(err => {
  console.error("Seed error:", err);
  mongoose.disconnect();
});
