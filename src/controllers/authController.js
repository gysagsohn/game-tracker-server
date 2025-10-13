// src/controllers/authController.js
const User = require("../models/UserModel");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const Session = require("../models/SessionModel");

// Helper: Create a JWT
function createToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// Helper: Send email verification link
async function sendVerificationEmail(user) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const html = `
    <h2>Email Verification</h2>
    <p>Hi ${user.firstName},</p>
    <p>Click below to verify your email:</p>
    <a href="${verificationLink}">${verificationLink}</a>
  `;
  console.log("📩 VERIFY EMAIL TOKEN:", token);
  await sendEmail(user.email, "Verify your email – Game Tracker", html);
}

// Signup
async function signup(req, res, next) {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: "Email already in use." });

    const role = "user";

    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
      authProvider: "local",
      isEmailVerified: false,
      role,
    });

    await newUser.save();

    // Sync guest matches to new account
    const sessions = await Session.updateMany(
      { "players.email": email, "players.user": null },
      { $set: { "players.$[elem].user": newUser._id } },
      { arrayFilters: [{ "elem.email": email, "elem.user": null }] }
    );
    console.log(`Synced ${sessions.modifiedCount} guest match(es) to ${email}`);

    await sendVerificationEmail(newUser);

    const token = createToken(newUser);
    res.status(201).json({ user: newUser, token });
  } catch (err) {
    next(err);
  }
}

// Login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (user.authProvider === "google" && !user.password) {
      return res
        .status(400)
        .json({ message: "This account uses Google sign-in. Please continue with Google." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isEmailVerified) return res.status(403).json({ message: "Please verify your email before logging in." });
    if (user.isSuspended) return res.status(403).json({ message: "Account is suspended." });

    const token = createToken(user);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

// Email verification
async function verifyEmail(req, res, next) {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ message: "Token missing" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isEmailVerified) return res.status(200).json({ message: "Email already verified" });

    user.isEmailVerified = true;
    await user.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
}

// Resend email verification
async function resendVerificationEmail(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.isEmailVerified) return res.status(400).json({ message: "Email already verified." });

    await sendVerificationEmail(user);
    res.json({ message: "Verification email resent.", data: user });
  } catch (err) {
    next(err);
  }
}

// Forgot password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.authProvider === "google" && !user.password) {
      return res
        .status(400)
        .json({ message: "This account uses Google sign-in. Please continue with Google to access your account." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const html = `
      <h2>Reset Your Password</h2>
      <p>Click below to reset your password:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Reset Password</a>
    `;
    await sendEmail(user.email, "Reset your Game Tracker password", html);

    res.json({ message: "Reset link sent to your email.", data: user });
  } catch (err) {
    next(err);
  }
}

// Reset password (define as a named function so we can export it cleanly)
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Missing token or password." });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.authProvider !== "local") {
      return res.status(400).json({ message: "This account uses Google sign-in. Use Google to log in." });
    }

    user.password = password;                   // pre-save hook will hash it
    user.resetPasswordToken = undefined;        // clear DB token (if used)
    user.resetPasswordExpires = undefined;
    await user.save();

    const freshToken = createToken(user);
    const safeUser = await User.findById(user._id).select("-password").lean();

    return res.json({
      message: "Password has been reset.",
      token: freshToken,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
};
