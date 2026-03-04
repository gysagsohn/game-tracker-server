const User = require("../models/UserModel");
const Game = require("../models/GameModel");
const Session = require("../models/SessionModel");

// GET /admin/users
// Returns all users (minus passwords) alongside all sessions.
// Used by the admin dashboard for a full system overview.
async function getAllUsersWithMatches(req, res, next) {
  try {
    const users = await User.find().select("-password");
    const sessions = await Session.find().populate("game players.user");
    res.json({ users, sessions });
  } catch (err) {
    next(err);
  }
}

// PUT /admin/users/:id
// Updates a user. Only whitelisted fields are accepted — this prevents
// an admin from accidentally overwriting password (which would store it
// unhashed since findByIdAndUpdate bypasses the pre-save hook), or
// other sensitive fields like resetPasswordToken.
async function updateUserByAdmin(req, res, next) {
  try {
    const allowedFields = ["firstName", "lastName", "email", "role", "isSuspended", "isEmailVerified"];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update." });
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password");
    if (!updated) return res.status(404).json({ message: "User not found." });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /admin/users/:id
// Permanently deletes a user account.
// Note: does not cascade-delete their sessions or notifications — see technical debt in README.
async function deleteUserByAdmin(req, res, next) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// POST /admin/games
// Creates a new game directly (admin bypass — no isCustom flag required)
async function createGameByAdmin(req, res, next) {
  try {
    const newGame = new Game(req.body);
    await newGame.save();
    res.status(201).json(newGame);
  } catch (err) {
    next(err);
  }
}

// PUT /admin/games/:id
async function updateGameByAdmin(req, res, next) {
  try {
    const updated = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /admin/games/:id
async function deleteGameByAdmin(req, res, next) {
  try {
    await Game.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// PUT /admin/sessions/:id
async function updateSessionByAdmin(req, res, next) {
  try {
    const updated = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /admin/sessions/:id
async function deleteSessionByAdmin(req, res, next) {
  try {
    await Session.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// GET /admin/search?query=...
// Searches users by name or email. Uses raw RegExp — admin-only route
// so risk is low, but sanitization would be a good future improvement.
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

// GET /admin/stats/users
// Returns high-level user counts for the admin dashboard
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

// GET /admin/stats/games
// Aggregates session data to show how many times each game has been played
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

// GET /admin/sessions/range?start=...&end=...
// Returns all sessions within a date range (inclusive of end-of-day)
async function getSessionsByDateRange(req, res, next) {
  try {
    const start = new Date(req.query.start);
    const end = new Date(req.query.end);
    end.setHours(23, 59, 59, 999); // include the full end day

    const sessions = await Session.find({
      date: { $gte: start, $lte: end }
    }).populate("game players.user");

    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

// GET /admin/stats/match-counts?unit=week|month
// Groups match counts by week or month for charting
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

// GET /admin/stats/top-players
// Returns the top 10 users sorted by stored win count.
// Note: user.stats.wins is not currently auto-updated — see README technical debt.
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

// GET /admin/stats/win-rates
// Calculates win rate per user from stored stats.
// Note: same caveat as getTopPlayers — stats.wins may be stale.
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

// POST /admin/users/:id/reset-stats
// Resets a user's stored win/loss stats to zero
async function resetUserStats(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { stats: { wins: 0, losses: 0, mostPlayed: "" } },
      { new: true }
    );
    res.json({ message: "User stats reset", user });
  } catch (err) {
    next(err);
  }
}

// POST /admin/users/:id/resend-verification
// Sends a fresh verification email to an unverified user.
// Uses the shared sendVerificationEmail helper from authController.
async function resendVerificationAsAdmin(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isEmailVerified) return res.status(400).json({ message: "Already verified" });

    // Reuse the shared helper so email template stays consistent
    const { sendVerificationEmail } = require("../controllers/authController");
    await sendVerificationEmail(user);

    res.json({ message: "Verification email resent successfully." });
  } catch (err) {
    next(err);
  }
}

// POST /admin/users/:id/force-verify
// Marks a user's email as verified without sending an email.
// Useful for manual support cases.
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

// POST /admin/users/:id/toggle-suspend
// Toggles a user's suspended state. Suspended users cannot log in.
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

// GET /admin/sessions
// Returns all sessions across all users, newest first
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