const User = require("../models/UserModel");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const linkGuestSessions = require("../utils/linkGuestSessions.js  ");

/** Create a signed JWT for a user (7-day expiry) */
function createToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Send an email verification link to a newly registered user.
 * Token is a short-lived JWT (1 hour). Link is NOT logged in production.
 *
 * @param {Object} user - Mongoose User document
 * @returns {Promise<boolean>} true if email sent successfully
 */
async function sendVerificationEmail(user) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  // Only log the link in development — the token is sensitive
  if (process.env.NODE_ENV !== "production") {
    console.log(`Verification link for ${user.email}: ${verificationLink}`);
  }

  const result = await sendEmail(
    user.email,
    "Verify Your Email – Keep Track",
    `
      <h2>Welcome to Keep Track!</h2>
      <p>Hi ${user.firstName},</p>
      <p>Thanks for signing up! Click the button below to verify your email address:</p>
      <p><a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background: #5865F2; color: white; text-decoration: none; border-radius: 8px;">Verify Email</a></p>
      <p style="color: #666; font-size: 14px;">Or copy this link: ${verificationLink}</p>
      <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
    `
  );

  if (!result.ok) {
    console.error("Failed to send verification email:", result.error);
  }

  return result.ok;
}

// Signup
async function signup(req, res, next) {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use." });
    }

    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      password,
      authProvider: "local",
      isEmailVerified: false,
      role: "user",
    });

    await newUser.save();

    // Link any guest matches created before this user signed up.
    // linkGuestSessions also auto-friends match creators and sends a notification email.
    await linkGuestSessions(newUser);

    const emailSent = await sendVerificationEmail(newUser);
    const safeUser = await User.findById(newUser._id).select("-password");

    return res.status(201).json({
      message: "Account created. Please verify your email to continue.",
      user: safeUser,
      emailSent,
    });
  } catch (err) {
    console.error("Signup error:", err);
    next(err);
  }
}

// Login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        message: "This account uses Google sign-in. Please continue with Google."
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in."
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: "Account is suspended." });
    }

    const token = createToken(user);
    const safeUser = await User.findById(user._id).select("-password");
    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
}

// Email verification
async function verifyEmail(req, res, next) {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ message: "Token missing" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isEmailVerified) {
      return res.status(200).json({ message: "Email already verified. You can log in now." });
    }

    // Atomic update — prevents duplicate verification on concurrent requests
    const result = await User.findOneAndUpdate(
      { _id: decoded.id, isEmailVerified: false },
      { $set: { isEmailVerified: true } },
      { new: true }
    ).select("-password");

    if (!result) {
      return res.status(200).json({ message: "Email already verified. You can log in now." });
    }

    res.status(200).json({ message: "Email verified successfully. You can now log in." });
  } catch {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
}

// Resend verification email
async function resendVerificationEmail(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.isEmailVerified) return res.status(400).json({ message: "Email already verified." });

    const emailSent = await sendVerificationEmail(user);

    // Return only what the frontend needs — not the full user object
    res.json({ message: "Verification email resent.", emailSent });
  } catch (err) {
    next(err);
  }
}

// Forgot password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return the same generic message to prevent email enumeration
    if (!user) {
      return res.json({
        message: "If your email is registered, you'll receive a password reset link shortly."
      });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.json({
        message: "This account uses Google sign-in. Please use the Google sign-in button."
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const result = await sendEmail(
      user.email,
      "Reset Your Password – Keep Track",
      `
        <h2>Reset Your Password</h2>
        <p>Hi ${user.firstName},</p>
        <p>We received a request to reset your password.</p>
        <p><a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #5865F2; color: white; text-decoration: none; border-radius: 8px;">Reset Password</a></p>
        <p style="color: #666; font-size: 14px;">Or copy this link: ${resetLink}</p>
        <p style="color: #999; font-size: 12px;">This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
      `
    );

    if (!result.ok) console.error("Failed to send password reset email:", result.error);

    res.json({
      message: "If your email is registered, you'll receive a password reset link shortly."
    });
  } catch (err) {
    next(err);
  }
}

// Reset password
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
      return res.status(400).json({
        message: "This account uses Google sign-in. Use Google to log in."
      });
    }

    // Confirm token matches stored value (single-use enforcement)
    if (!user.resetPasswordToken || user.resetPasswordToken !== token) {
      return res.status(400).json({
        message: "Invalid or already-used token. Please request a new password reset."
      });
    }

    if (!user.resetPasswordExpires || Date.now() > user.resetPasswordExpires) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(400).json({
        message: "Token has expired. Please request a new password reset."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const freshToken = createToken(user);
    const safeUser = await User.findById(user._id).select("-password");

    return res.json({
      message: "Password has been reset successfully.",
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