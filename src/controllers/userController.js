const User = require("../models/UserModel");
const Session = require("../models/SessionModel");
const mongoose = require("mongoose");
const logUserActivity = require("../utils/logActivity");
const { sanitizeObject } = require("../utils/sanitize");
const { DATA } = require("../constants/limits");

// GET /users/me
async function getLoggedInUser(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ message: "Fetched logged-in user", data: user });
  } catch (err) {
    next(err);
  }
}

// GET /users/:id
async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Fetched user", data: user });
  } catch (err) {
    next(err);
  }
}

/**
 * Update the current user's profile.
 * Only firstName, lastName, and profileIcon can be changed by the user.
 *
 * @route PUT /users/:id
 */
async function updateUser(req, res, next) {
  try {
    const allowedFields = ["firstName", "lastName", "profileIcon"];
    const updates = sanitizeObject(req.body, allowedFields);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    await logUserActivity(req.user._id, "Updated Profile");
    res.json({ message: "User updated", data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Change the current user's password.
 * Verifies the current password before applying the new one.
 * Only available to local (email/password) accounts.
 *
 * @route POST /users/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.authProvider !== "local") {
      return res.status(400).json({
        message: "This account uses Google sign-in. Password cannot be changed here."
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    // Assign and save so the pre('save') hook hashes the new password.
    // findByIdAndUpdate bypasses the hook and would store plaintext.
    user.password = newPassword;
    await user.save();

    await logUserActivity(req.user._id, "Changed Password");
    res.json({ message: "Password updated successfully." });
  } catch (err) {
    next(err);
  }
}

// DELETE /users/:id
async function deleteUser(req, res, next) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

/**
 * Calculate stats for a user from their session history.
 *
 * Returns:
 * - Win/loss/draw counts and total matches
 * - Win rate percentage
 * - Current win streak
 * - Most played game
 * - Favorite opponent (most matches together)
 * - Best win-rate opponent (min 2 games)
 *
 * Note: calculates dynamically from sessions rather than reading
 * user.stats, which is a stored snapshot that is never updated.
 *
 * @route GET /users/:id/stats
 */
async function getUserStats(req, res, next) {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.id);
    const sessions = await Session.find({ "players.user": userId })
      .populate("game players.user")
      .sort({ date: 1 }); // ascending for streak calculation

    if (sessions.length === 0) {
      return res.json({ message: "No matches found", data: {} });
    }

    let wins = 0, losses = 0, draws = 0;
    let currentStreak = 0, longestStreak = 0, streakTemp = 0;
    const gameCounts = {};
    const opponentCounts = {};
    const opponentWins = {};

    for (const session of sessions) {
      const players = Array.isArray(session.players) ? session.players : [];
      const me = players.find(p => p.user && p.user._id && p.user._id.equals(userId));
      if (!me) continue;

      if (me.result === "Win") {
        wins++;
        streakTemp++;
        if (streakTemp > longestStreak) longestStreak = streakTemp;
      } else if (me.result === "Loss") {
        losses++;
        streakTemp = 0;
      } else if (me.result === "Draw") {
        draws++;
        // draws don't break or extend a win streak
      }

      const title = session?.game?.name || "Unknown Game";
      gameCounts[title] = (gameCounts[title] || 0) + 1;

      for (const p of players) {
        if (!p.user || !p.user._id || p.user._id.equals(userId)) continue;
        const oppId = p.user._id.toString();
        opponentCounts[oppId] = (opponentCounts[oppId] || 0) + 1;
        if (me.result === "Win") opponentWins[oppId] = (opponentWins[oppId] || 0) + 1;
      }
    }

    // Current streak = the running streakTemp at the end of the sorted list
    currentStreak = streakTemp;

    const totalMatches = wins + losses + draws;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    const mostPlayedGame = Object.entries(gameCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    // Most-played-against opponent
    const favoriteOpponentId = Object.entries(opponentCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    const favoriteOpponent = favoriteOpponentId
      ? sessions
          .flatMap(s => Array.isArray(s.players) ? s.players : [])
          .find(p => p.user && p.user._id && p.user._id.toString() === favoriteOpponentId)?.user
      : null;

    // Best win-rate opponent (min 2 games together)
    const winRateOpponents = Object.entries(opponentCounts)
      .filter(([_, count]) => count >= 2)
      .map(([id, total]) => ({
        opponentId: id,
        winRate: Math.round(((opponentWins[id] || 0) / total) * 100),
      }))
      .sort((a, b) => b.winRate - a.winRate);

    const topOpponentId = winRateOpponents[0]?.opponentId;
    const bestWinOpponent = topOpponentId
      ? sessions
          .flatMap(s => Array.isArray(s.players) ? s.players : [])
          .find(p => p.user && p.user._id && p.user._id.toString() === topOpponentId)?.user
      : null;

    return res.json({
      message: "User stats calculated",
      data: {
        totalMatches,
        wins,
        losses,
        draws,
        winRate,           // e.g. 67 (percent)
        currentStreak,     // current consecutive wins at time of last match
        longestStreak,     // all-time best consecutive win streak
        mostPlayedGame,
        favoriteOpponent: favoriteOpponent
          ? {
              name: `${favoriteOpponent.firstName || ""} ${favoriteOpponent.lastName || ""}`.trim(),
              matchesTogether: opponentCounts[favoriteOpponentId],
            }
          : null,
        bestWinOpponent: bestWinOpponent
          ? {
              name: `${bestWinOpponent.firstName || ""} ${bestWinOpponent.lastName || ""}`.trim(),
              winRate: (winRateOpponents[0]?.winRate ?? 0) + "%",
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /users/search?q=john
async function searchUsers(req, res, next) {
  try {
    const { sanitizeString } = require("../utils/sanitize");
    const query = sanitizeString(req.query.q || "");
    const currentUserId = req.user._id.toString();

    if (query.length < DATA.SEARCH_QUERY_MIN_LENGTH) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const users = await User.find({
      $and: [
        {
          $or: [
            { firstName: new RegExp(query, "i") },
            { lastName: new RegExp(query, "i") },
            { email: new RegExp(query, "i") },
          ],
        },
        { _id: { $ne: currentUserId } },
        { isSuspended: false },
      ],
    })
      .select("firstName lastName email profileIcon")
      .limit(DATA.SEARCH_RESULTS_MAX);

    res.json({ message: "Search results", data: users });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLoggedInUser,
  getUserById,
  updateUser,
  changePassword,
  deleteUser,
  getUserStats,
  searchUsers,
};