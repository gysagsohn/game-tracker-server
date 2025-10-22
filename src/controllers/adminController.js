const User = require("../models/UserModel");
const Game = require("../models/GameModel");
const Session = require("../models/SessionModel");

// View all users and sessions
async function getAllUsersWithMatches(req, res, next) {
  try {
    const users = await User.find().select("-password");
    const sessions = await Session.find()
      .populate("game players.user"); 
    res.json({ users, sessions });
  } catch (err) {
    next(err);
  }
}

// CRUD - Users
async function updateUserByAdmin(req, res, next) {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteUserByAdmin(req, res, next) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// CRUD - Games
async function createGameByAdmin(req, res, next) {
  try {
    const newGame = new Game(req.body);
    await newGame.save();
    res.status(201).json(newGame);
  } catch (err) {
    next(err);
  }
}

async function updateGameByAdmin(req, res, next) {
  try {
    const updated = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteGameByAdmin(req, res, next) {
  try {
    await Game.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// CRUD - Sessions
async function updateSessionByAdmin(req, res, next) {
  try {
    const updated = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteSessionByAdmin(req, res, next) {
  try {
    await Session.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// Analytics
async function searchUsers(req, res, next) {
  try {
    const query = req.query.query || "";
    const users = await User.find({
      $or: [
        { firstName: new RegExp(query, "i") },
        { lastName: new RegExp(query, "i") },
        { email: new RegExp(query, "i") }
      ]
    }).select("-password");
    res.json(users);
  } catch (err) {
    next(err);
  }
}


async function getSystemUserStats(req, res, next) {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
    const admins = await User.countDocuments({ role: "admin" });

    res.json({ totalUsers, verifiedUsers, admins });
  } catch (err) {
    next(err);
  }
}

async function getGameStats(req, res, next) {
  try {
    const stats = await Session.aggregate([
      { $group: { _id: "$game", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "games",
          localField: "_id",
          foreignField: "_id",
          as: "gameInfo"
        }
      },
      { $unwind: "$gameInfo" },
      {
        $project: {
          gameId: "$gameInfo._id",
          title: "$gameInfo.name",
          plays: "$count"
        }
      },
      { $sort: { plays: -1 } }
    ]);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

async function getSessionsByDateRange(req, res, next) {
  try {
    const start = new Date(req.query.start);
    const end = new Date(req.query.end);
    end.setHours(23, 59, 59, 999);

    const sessions = await Session.find({
      date: { $gte: start, $lte: end }
    }).populate("game players.user");

    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

async function getMatchCountsGrouped(req, res, next) {
  try {
    const unit = req.query.unit === "month" ? "%Y-%m" : "%Y-%U";
    const groupBy = { $dateToString: { format: unit, date: "$date" } };

    const data = await Session.aggregate([
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getTopPlayers(req, res, next) {
  try {
    const users = await User.find()
      .sort({ "stats.wins": -1 })
      .limit(10)
      .select("firstName lastName stats.wins");
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function getUserWinRates(req, res, next) {
  try {
    const users = await User.find().select("firstName lastName stats");

    const winRates = users.map(user => {
      const total = user.stats.wins + user.stats.losses;
      const rate = total > 0 ? (user.stats.wins / total) * 100 : 0;

      return {
        name: `${user.firstName} ${user.lastName}`,
        winRate: Math.round(rate)
      };
    });

    res.json(winRates);
  } catch (err) {
    next(err);
  }
}

// Admin tools
async function resetUserStats(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        stats: { wins: 0, losses: 0, mostPlayed: "" }
      },
      { new: true }
    );
    res.json({ message: "User stats reset", user });
  } catch (err) {
    next(err);
  }
}

async function resendVerificationAsAdmin(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isEmailVerified) return res.status(400).json({ message: "Already verified" });

    // Import utilities
    const sendEmail = require("../utils/sendEmail");
    const jwt = require("jsonwebtoken");

    // Generate verification token (1 hour expiry)
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    // Send verification email with proper text and html
    await sendEmail({
      to: user.email,
      subject: "Verify Your Email - Game Tracker",
      text: `Hi ${user.firstName},\n\nPlease verify your email by clicking this link:\n${verificationUrl}\n\nThis link expires in 1 hour.\n\nThe Game Tracker Team`,
      html: `
        <h2>Verify Your Email</h2>
        <p>Hi ${user.firstName},</p>
        <p>Click the button below to verify your email address:</p>
        <p><a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #5865F2; color: white; text-decoration: none; border-radius: 8px;">Verify Email</a></p>
        <p style="color: #666; font-size: 14px;">Or copy this link: ${verificationUrl}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
      `
    });

    res.json({ message: "Verification email resent successfully." });
  } catch (err) {
    next(err);
  }
}

async function forceVerifyUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { isEmailVerified: true }, 
      { new: true }
    ).select("-password");
    
    res.json({ message: "User email verified by admin", user });
  } catch (err) {
    next(err);
  }
}

async function toggleSuspendUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    user.isSuspended = !user.isSuspended;
    await user.save();
    
    res.json({ 
      message: user.isSuspended ? "User suspended" : "User reactivated",
      user: { id: user._id, isSuspended: user.isSuspended }
    });
  } catch (err) {
    next(err);
  }
}

async function getAllSessionsForAdmin(req, res, next) {
  try {
    const sessions = await Session.find()
      .populate("game players.user")
      .sort({ date: -1 });
    res.json({ message: "All sessions", data: sessions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsersWithMatches,
  updateUserByAdmin,
  deleteUserByAdmin,
  createGameByAdmin,
  updateGameByAdmin,
  deleteGameByAdmin,
  updateSessionByAdmin,
  deleteSessionByAdmin,
  searchUsers,
  getSystemUserStats, 
  getGameStats,
  getSessionsByDateRange,
  getMatchCountsGrouped,
  getTopPlayers,
  getUserWinRates,
  resetUserStats,
  resendVerificationAsAdmin,
  forceVerifyUser,
  toggleSuspendUser,
  getAllSessionsForAdmin
};