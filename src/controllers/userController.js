const User = require("../models/UserModel");
const Game = require("../models/GameModel");
const Session = require("../models/SessionModel");
const mongoose = require("mongoose");
const logUserActivity = require("../utils/logActivity");
const { sanitizeObject } = require("../utils/sanitize");

// GET /users/me
async function getLoggedInUser(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ message: "Fetched logged-in user", data: user });
  } catch (err) {
    next(err);
  }
}

// GET /users
async function getAllUsers(req, res, next) {
  try {
    const users = await User.find().select("-password");
    res.json({ message: "Fetched all users", data: users });
  } catch (err) {
    next(err);
  }
}

// POST /users
async function createUser(req, res, next) {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json({ message: "User created", data: newUser });
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

// PUT /users/:id
async function updateUser(req, res, next) {
  try {
    // Whitelist: only these fields can be updated by users
    const allowedFields = ["firstName", "lastName", "profileIcon"];
    
    // Sanitize the allowed fields
    const updates = sanitizeObject(req.body, allowedFields);
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        message: "No valid fields to update" 
      });
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

// DELETE /users/:id
async function deleteUser(req, res, next) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

// GET /users/:id/stats
async function getUserStats(req, res, next) {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.id);
    const sessions = await Session.find({ "players.user": userId })
      .populate("game players.user");

    if (sessions.length === 0) {
      return res.json({ message: "No matches found", data: {} });
    }

    let wins = 0, losses = 0, draws = 0;
    const gameCounts = {};
    const opponentCounts = {};
    const opponentWins = {};

    for (const session of sessions) {
      // Skip sessions that somehow have no players array
      const players = Array.isArray(session.players) ? session.players : [];

      // Find "me" safely
      const me = players.find(p => p.user && p.user._id && p.user._id.equals(userId));
      if (!me) continue;

      // Tally W/L/D safely
      if (me.result === "Win") wins++;
      else if (me.result === "Loss") losses++;
      else if (me.result === "Draw") draws++;

      // Game title (handle deleted/missing game)
      const title = session?.game?.name || "Unknown Game";
      gameCounts[title] = (gameCounts[title] || 0) + 1;

      // Opponent tallies
      for (const p of players) {
        if (!p.user || !p.user._id || p.user._id.equals(userId)) continue;
        const oppId = p.user._id.toString();
        opponentCounts[oppId] = (opponentCounts[oppId] || 0) + 1;
        if (me.result === "Win") opponentWins[oppId] = (opponentWins[oppId] || 0) + 1;
      }
    }

    // Derive most played game (string name)
    const mostPlayedGame = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Favorite opponent by frequency
    const favoriteOpponentId = Object.entries(opponentCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const favoriteOpponent = favoriteOpponentId
      ? sessions
          .flatMap(s => Array.isArray(s.players) ? s.players : [])
          .find(p => p.user && p.user._id && p.user._id.toString() === favoriteOpponentId)?.user
      : null;

    // Best win-rate opponent (min 2 games)
    const winRateOpponents = Object.entries(opponentCounts)
      .filter(([_, count]) => count >= 2)
      .map(([id, total]) => ({
        opponentId: id,
        winRate: Math.round(((opponentWins[id] || 0) / total) * 100),
      }))
      .sort((a, b) => b.winRate - a.winRate);

    const topOpponentId = winRateOpponents[0]?.opponentId;
    const favoriteWinOpponent = topOpponentId
      ? sessions
          .flatMap(s => Array.isArray(s.players) ? s.players : [])
          .find(p => p.user && p.user._id && p.user._id.toString() === topOpponentId)?.user
      : null;

    const totalMatches = wins + losses + draws;

    return res.json({
      message: "User stats calculated",
      data: {
        totalMatches,
        wins,
        losses,
        draws,
        mostPlayedGame, // string (may be "Unknown Game")
        favoriteOpponent: favoriteOpponent
          ? {
              name: `${favoriteOpponent.firstName || ""} ${favoriteOpponent.lastName || ""}`.trim(),
              matchesTogether: favoriteOpponentId ? opponentCounts[favoriteOpponentId] : 0,
            }
          : null,
        favoriteWinOpponent: favoriteWinOpponent
          ? {
              name: `${favoriteWinOpponent.firstName || ""} ${favoriteWinOpponent.lastName || ""}`.trim(),
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
    const query = req.query.q || "";
    const currentUserId = req.user._id.toString();
    
    if (query.length < 2) {
      return res.status(400).json({ 
        message: "Search query must be at least 2 characters" 
      });
    }

    // Search by name or email (case-insensitive)
    const users = await User.find({
      $and: [
        {
          $or: [
            { firstName: new RegExp(query, "i") },
            { lastName: new RegExp(query, "i") },
            { email: new RegExp(query, "i") }
          ]
        },
        { _id: { $ne: currentUserId } }, // Exclude yourself
        { isSuspended: false } // Exclude suspended users
      ]
    })
    .select("firstName lastName email profileIcon")
    .limit(10); // Limit results to prevent overload

    res.json({ 
      message: "Search results", 
      data: users 
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  getLoggedInUser,
  searchUsers
};
