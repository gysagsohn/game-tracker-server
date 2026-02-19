

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

  // ✅ SECURE: Get admin credentials from environment variables
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminFirstName = process.env.ADMIN_FIRST_NAME || "Admin";
  const adminLastName = process.env.ADMIN_LAST_NAME || "User";

  // Validate required environment variables
  if (!adminEmail || !adminPassword) {
    console.log("\n" + "⚠️ ".repeat(35));
    console.log("WARNING: Admin credentials not provided in environment variables!");
    console.log("Skipping admin user creation.");
    console.log("\nTo create an admin user, add to your .env file:");
    console.log("  ADMIN_EMAIL=your-email@example.com");
    console.log("  ADMIN_PASSWORD=YourSecurePassword123!");
    console.log("  ADMIN_FIRST_NAME=Your");
    console.log("  ADMIN_LAST_NAME=Name");
    console.log("⚠️ ".repeat(35) + "\n");
  } else {
    // Create admin user
    console.log("\nCreating admin user...");
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`  [EXISTS]  Admin user: ${adminEmail}`);
    } else {
      const admin = await User.create({
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        authProvider: "local",
        isEmailVerified: true
      });
      console.log(`  [CREATED] Admin user: ${adminEmail}`);
      console.log(`  [INFO]    Password set from environment variable`);
      console.log(`  [WARNING] Store these credentials securely!`);
    }
  }

  await databaseClose();
  
  console.log("\n" + "=".repeat(70));
  console.log("SEEDING COMPLETE");
  console.log("=".repeat(70));
  console.log("\nGAMES SEEDED: 8 games");
  
  if (adminEmail) {
    console.log("\nADMIN ACCOUNT:");
    console.log(`  Email: ${adminEmail}`);
    console.log("  Password: (set via environment variable)");
  }
  
  
  console.log("\n" + "=".repeat(70));
  console.log("\nYou can now run: npm run dev");
  console.log("Then start testing at: http://localhost:5173\n");
}

seed().catch(err => {
  console.error("Seed error:", err);
  mongoose.disconnect();
});