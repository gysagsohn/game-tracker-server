const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Game = require("../models/GameModel");
const User = require("../models/UserModel");
const { databaseConnect, databaseClose } = require("../config/database");

dotenv.config();

async function seed() {
  await databaseConnect();

  // Seed games
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
    },
    {
      name: "Ticket to Ride",
      category: "Board",
      minPlayers: 2,
      maxPlayers: 5,
      isCustom: false
    },
    {
      name: "Exploding Kittens",
      category: "Card",
      minPlayers: 2,
      maxPlayers: 5,
      isCustom: false
    }
  ];

  console.log("\nSeeding games...");
  for (let game of standardGames) {
    const exists = await Game.findOne({ name: game.name });
    if (!exists) {
      await Game.create(game);
      console.log(`  [CREATED] ${game.name}`);
    } else {
      console.log(`  [EXISTS]  ${game.name}`);
    }
  }

  // Create admin user
  console.log("\nCreating admin user...");
  const adminEmail = "gysagsohn@hotmail.com";
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    console.log(`  [EXISTS]  Admin user: ${adminEmail}`);
  } else {
    const admin = await User.create({
      firstName: "Admin Gy",
      lastName: "Sohn",
      email: adminEmail,
      password: "Admin123!", // CHANGE THIS PASSWORD AFTER FIRST LOGIN
      role: "admin",
      authProvider: "local",
      isEmailVerified: true
    });
    console.log(`  [CREATED] Admin user: ${adminEmail}`);
    console.log(`  [INFO]    Default password: Admin123!`);
    console.log(`  [WARNING] CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN`);
  }

  // Create test users for testing friend functionality
  console.log("\nCreating test users...");
  
  const testUsers = [
    {
      firstName: "Alice",
      lastName: "Smith",
      email: "alice.smith@example.com",
      password: "Test123!",
      role: "user",
      authProvider: "local",
      isEmailVerified: true
    },
    {
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob.johnson@example.com",
      password: "Test123!",
      role: "user",
      authProvider: "local",
      isEmailVerified: true
    },
    {
      firstName: "Charlie",
      lastName: "Brown",
      email: "charlie.brown@example.com",
      password: "Test123!",
      role: "user",
      authProvider: "local",
      isEmailVerified: true
    }
  ];

  for (let userData of testUsers) {
    const exists = await User.findOne({ email: userData.email });
    if (!exists) {
      await User.create(userData);
      console.log(`  [CREATED] ${userData.email}`);
    } else {
      console.log(`  [EXISTS]  ${userData.email}`);
    }
  }

  await databaseClose();
  
  console.log("\n" + "=".repeat(70));
  console.log("SEEDING COMPLETE");
  console.log("=".repeat(70));
  console.log("\nACCOUNTS CREATED:\n");
  console.log("ADMIN ACCOUNT:");
  console.log("  Email:    gysagsohn@hotmail.com");
  console.log("  Password: Admin123!");
  console.log("  WARNING:  CHANGE THIS PASSWORD IMMEDIATELY!\n");
  console.log("TEST USERS (all passwords: Test123!):");
  console.log("  alice.smith@example.com");
  console.log("  bob.johnson@example.com");
  console.log("  charlie.brown@example.com\n");
  console.log("GAMES SEEDED: 8 games\n");
  console.log("=".repeat(70));
  console.log("\nYou can now run: npm run dev");
  console.log("Then start testing at: http://localhost:5173\n");
}

seed().catch(err => {
  console.error("Seed error:", err);
  mongoose.disconnect();
});