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
    const firstName = await question("First name (leave empty to keep existing): ");
    const lastName = await question("Last name (leave empty to keep existing): ");

    if (!email || !password) {
      console.error("Email and password are required");
      process.exit(1);
    }

    const existing = await User.findOne({ email });

    if (existing) {
      console.log(`Found existing user: ${email}`);
      
      // Always update role and password
      existing.role = "admin";
      existing.password = password; // This will trigger the pre-save hook to hash it
      existing.isEmailVerified = true;
      
      // Update name if provided
      if (firstName) existing.firstName = firstName;
      if (lastName) existing.lastName = lastName;
      
      await existing.save();
      console.log(`Updated ${email} to admin role with new password`);
    } else {
      await User.create({
        firstName: firstName || "Admin",
        lastName: lastName || "User",
        email,
        password, // Will be hashed by pre-save hook
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