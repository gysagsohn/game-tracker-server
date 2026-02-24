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

  console.log(`📧 Sending verification email to: ${user.email}`);
  console.log(`🔗 Verification link: ${verificationLink}`);

  const result = await sendEmail(
    user.email,
    "Verify Your Email - Game Tracker",
    `
      <h2>Welcome to Game Tracker!</h2>
      <p>Hi ${user.firstName},</p>
      <p>Thanks for signing up! Click the button below to verify your email address:</p>
      <p><a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background: #5865F2; color: white; text-decoration: none; border-radius: 8px;">Verify Email</a></p>
      <p style="color: #666; font-size: 14px;">Or copy this link: ${verificationLink}</p>
      <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
    `
  );

  if (!result.ok) {
    console.error("❌ Failed to send verification email:", result.error);
  } else {
    console.log(`✅ Verification email sent successfully to ${user.email}`);
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
    console.log(`✅ User created: ${newUser.email}`);

    // Link guest matches + auto-friend inviters
    const sessionsWithGuest = await Session.find({
      'players.email': newUser.email,
      'players.user': null
    });

    if (sessionsWithGuest.length > 0) {
      const inviterIds = new Set();

      for (const session of sessionsWithGuest) {
        session.players.forEach((player) => {
          if (player.email === newUser.email && !player.user) {
            player.user = newUser._id;
            player.confirmed = true;
          }
        });

        if (session.createdBy) {
          inviterIds.add(session.createdBy.toString());
        }

        await session.save();
      }

      console.log(`Synced ${sessionsWithGuest.length} guest match(es) to ${newUser.email}`);

      // Auto-friend each match creator
      for (const inviterId of inviterIds) {
        if (inviterId === newUser._id.toString()) continue;

        try {
          const inviter = await User.findById(inviterId);
          if (!inviter) continue;

          const alreadyFriends = newUser.friends?.some(f => f.toString() === inviterId);
          if (!alreadyFriends) {
            newUser.friends = newUser.friends || [];
            newUser.friends.push(inviterId);

            inviter.friends = inviter.friends || [];
            if (!inviter.friends.some(f => f.toString() === newUser._id.toString())) {
              inviter.friends.push(newUser._id);
            }
            await inviter.save();
            console.log(`Auto-friended ${newUser.email} with inviter ${inviter.email}`);
          }
        } catch (friendErr) {
          console.warn("Auto-friend failed for inviter", inviterId, friendErr.message);
        }
      }

      await newUser.save();

      // Notify new user their matches have been linked
      try {
        const result = await sendEmail(
          newUser.email,
          'Your Guest Matches Have Been Linked!',
          `
            <h2>Welcome to Game Tracker, ${newUser.firstName}!</h2>
            <p>Good news! We found <strong>${sessionsWithGuest.length} match(es)</strong> where you were invited as a guest.</p>
            <p>These have now been linked to your new account.</p>
            <p><a href="${process.env.FRONTEND_URL}/matches" style="display: inline-block; padding: 10px 20px; background: #5865F2; color: white; text-decoration: none; border-radius: 8px;">View Your Matches</a></p>
          `
        );
        if (!result.ok) console.error("Failed to send guest match notification:", result.error);
      } catch (error) {
        console.error("Failed to send guest match notification:", error);
      }
    }

    // Send verification email
    console.log(`📧 Attempting to send verification email to ${newUser.email}...`);
    const emailSent = await sendVerificationEmail(newUser);
    console.log(`📧 Verification email result: ${emailSent ? 'SUCCESS ✅' : 'FAILED ❌'}`);

    const safeUser = await User.findById(newUser._id).select("-password");

    return res.status(201).json({
      message: "Account created. Please verify your email to continue.",
      user: safeUser,
      emailSent,
    });
  } catch (err) {
    console.error("❌ Signup error:", err);
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
    if (!token) {
      return res.status(400).json({ message: "Token missing" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        message: "Email already verified. You can log in now."
      });
    }

    const result = await User.findOneAndUpdate(
      { _id: decoded.id, isEmailVerified: false },
      { $set: { isEmailVerified: true } },
      { new: true }
    ).select("-password");

    if (!result) {
      return res.status(200).json({
        message: "Email already verified. You can log in now."
      });
    }

    res.status(200).json({
      message: "Email verified successfully. You can now log in."
    });
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
}

// Resend email verification
async function resendVerificationEmail(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified." });
    }

    const emailSent = await sendVerificationEmail(user);
    const safeUser = await User.findById(user._id).select("-password");

    res.json({ message: "Verification email resent.", data: safeUser, emailSent });
  } catch (err) {
    next(err);
  }
}

// Forgot password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log(`Password reset attempted for non-existent email: ${email}`);
      return res.json({
        message: "If your email is registered, you'll receive a password reset link shortly."
      });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.json({
        message: "If your email is registered, you'll receive a password reset link shortly. Note: Google sign-in accounts cannot reset passwords this way."
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const result = await sendEmail(
      user.email,
      "Reset Your Password - Game Tracker",
      `
        <h2>Reset Your Password</h2>
        <p>Hi ${user.firstName},</p>
        <p>We received a request to reset your password.</p>
        <p><a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #5865F2; color: white; text-decoration: none; border-radius: 8px;">Reset Password</a></p>
        <p style="color: #666; font-size: 14px;">Or copy this link: ${resetLink}</p>
        <p style="color: #999; font-size: 12px;">This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
      `
    );

    if (!result.ok) {
      console.error("Failed to send password reset email:", result.error);
    }

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
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.authProvider !== "local") {
      return res.status(400).json({
        message: "This account uses Google sign-in. Use Google to log in."
      });
    }

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
      return res.status(400).json({
        message: "Password must be at least 8 characters long."
      });
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