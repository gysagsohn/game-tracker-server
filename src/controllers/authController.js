const User = require("../models/UserModel");
const jwt = require("jsonwebtoken");

// Helper: Generate JWT
function createToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// Stub: Simulate email verification
function sendVerificationEmail(user) {
  const verificationToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}`;

  console.log(`🔐 [Email Stub] Send this to user: ${user.email}`);
  console.log(`👉 Verification Link: ${verificationLink}`);
}

// ✅ Signup
async function signup(req, res, next) {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use." });
    }

    const role = email === "gysagsohn@hotmail.com" ? "admin" : "user";

    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
      authProvider: "local",
      isEmailVerified: true,
      role
    });

    await newUser.save();
    sendVerificationEmail(newUser);

    const token = createToken(newUser);
    res.status(201).json({ user: newUser, token });
  } catch (err) {
    next(err);
  }
}

// ✅ Login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Optional: Enforce email verification
    // if (!user.isEmailVerified) {
    //   return res.status(403).json({ message: "Please verify your email before logging in." });
    // }

    const token = createToken(user);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

// ✅ Email Verification
async function verifyEmail(req, res, next) {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ message: "Token missing" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isEmailVerified) {
      return res.status(200).json({ message: "Email already verified" });
    }

    user.isEmailVerified = true;
    await user.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: "Invalid or expired token" });
  }
}

module.exports = {
  signup,
  login,
  verifyEmail
};
