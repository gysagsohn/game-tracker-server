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
  
  try {
    await sendEmail({
      to: user.email,
      subject: "Verify Your Email - Game Tracker",
      text: `Hi ${user.firstName},\n\nWelcome to Game Tracker! Please verify your email by clicking this link:\n${verificationLink}\n\nThis link expires in 1 hour.\n\nThe Game Tracker Team`,
      html: `
        <h2>Welcome to Game Tracker!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thanks for signing up! Click the button below to verify your email address:</p>
        <p><a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background: #5865F2; color: white; text-decoration: none; border-radius: 8px;">Verify Email</a></p>
        <p style="color: #666; font-size: 14px;">Or copy this link: ${verificationLink}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
      `
    });
    return true;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return false;
  }
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

    // Link guest matches to new account
    const sessionsWithGuest = await Session.find({
      'players.email': newUser.email,
      'players.user': null
    });

    if (sessionsWithGuest.length > 0) {
      for (const session of sessionsWithGuest) {
        session.players.forEach((player) => {
          if (player.email === newUser.email && !player.user) {
            player.user = newUser._id;
            player.confirmed = true;
          }
        });
        await session.save();
      }

      console.log(`Synced ${sessionsWithGuest.length} guest match(es) to ${newUser.email}`);

      // Send guest match notification email
      try {
        await sendEmail({
          to: newUser.email,
          subject: 'Your Guest Matches Have Been Linked!',
          text: `Hi ${newUser.firstName},\n\nGood news! We found ${sessionsWithGuest.length} match(es) where you were invited as a guest. These have now been linked to your new Game Tracker account.\n\nYou can view them on your dashboard once you verify your email.\n\nHappy gaming!\n\nThe Game Tracker Team`,
          html: `
            <h2>Welcome to Game Tracker, ${newUser.firstName}!</h2>
            <p>Good news! We found <strong>${sessionsWithGuest.length} match(es)</strong> where you were invited as a guest.</p>
            <p>These have now been linked to your new account.</p>
            <p><a href="${process.env.FRONTEND_URL}/matches" style="display: inline-block; padding: 10px 20px; background: #5865F2; color: white; text-decoration: none; border-radius: 8px;">View Your Matches</a></p>
            <p style="color: #666; font-size: 14px;">Happy gaming!</p>
            <p style="color: #999; font-size: 12px;">The Game Tracker Team</p>
          `
        });
      } catch (error) {
        console.error("Failed to send guest match notification:", error);
        // Don't fail signup if notification email fails
      }
    }

    // Send verification email
    const emailSent = await sendVerificationEmail(newUser);

    // Return user without password
    const safeUser = await User.findById(newUser._id).select("-password");
    
    return res.status(201).json({
      message: "Account created. Please verify your email to continue.",
      user: safeUser,
      emailSent,
    });
  } catch (err) {
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

      // Verify token first before database lookup
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

      // Check if already verified
      if (user.isEmailVerified) {
        return res.status(200).json({ 
          message: "Email already verified. You can log in now." 
        });
      }

      // Use atomic update to prevent race condition
      const result = await User.findOneAndUpdate(
        { 
          _id: decoded.id, 
          isEmailVerified: false // Only update if not already verified
        },
        { 
          $set: { isEmailVerified: true }
        },
        { new: true }
      ).select("-password");

      // Check if update actually happened
      if (!result) {
        // Another request already verified this email
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
      return res.status(404).json({ message: "User not found." });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({ 
        message: "This account uses Google sign-in. Please continue with Google to access your account." 
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    try {
      await sendEmail({
        to: user.email,
        subject: "Reset Your Password - Game Tracker",
        text: `Hi ${user.firstName},\n\nWe received a request to reset your password. Click this link to reset it:\n${resetLink}\n\nThis link expires in 15 minutes. If you didn't request this, you can ignore this email.\n\nThe Game Tracker Team`,
        html: `
          <h2>Reset Your Password</h2>
          <p>Hi ${user.firstName},</p>
          <p>We received a request to reset your password.</p>
          <p><a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #5865F2; color: white; text-decoration: none; border-radius: 8px;">Reset Password</a></p>
          <p style="color: #666; font-size: 14px;">Or copy this link: ${resetLink}</p>
          <p style="color: #999; font-size: 12px;">This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
        `
      });
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return res.status(500).json({ message: "Failed to send reset email." });
    }

    const safeUser = await User.findById(user._id).select("-password");
    res.json({ 
      message: "If your email exists, a reset link has been sent.", 
      data: safeUser 
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

      // Verify JWT token structure
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

      // Check if this is a Google account
      if (user.authProvider !== "local") {
        return res.status(400).json({ 
          message: "This account uses Google sign-in. Use Google to log in." 
        });
      }

      // Validate the token matches the one in database
      if (!user.resetPasswordToken || user.resetPasswordToken !== token) {
        return res.status(400).json({ 
          message: "Invalid or already-used token. Please request a new password reset." 
        });
      }

      //  Check if token has expired
      if (!user.resetPasswordExpires || Date.now() > user.resetPasswordExpires) {
        // Clear expired token
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        
        return res.status(400).json({ 
          message: "Token has expired. Please request a new password reset." 
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ 
          message: "Password must be at least 8 characters long." 
        });
      }

      // Update password
      user.password = password; // pre-save hook will hash it
      
      // Invalidate the reset token immediately
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      
      await user.save();

      // AUTO-LOGIN: Generate new login token
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