require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/UserModel");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("Connected to MongoDB");

    const email = await question("Admin email: ");
    const password = await question("Admin password: ");
    const firstName = await question("First name: ");
    const lastName = await question("Last name: ");

    if (!email || !password) {
      console.error("Email and password are required");
      process.exit(1);
    }

    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.role === "admin") {
        console.log(`User ${email} is already an admin`);
      } else {
        existing.role = "admin";
        await existing.save();
        console.log(`Updated ${email} to admin role`);
      }
    } else {
      await User.create({
        firstName: firstName || "Admin",
        lastName: lastName || "User",
        email,
        password,
        role: "admin",
        authProvider: "local",
        isEmailVerified: true
      });
      console.log(`Created new admin user: ${email}`);
    }

    await mongoose.connection.close();
    rl.close();
    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err.message);
    rl.close();
    process.exit(1);
  }
}

createAdmin();