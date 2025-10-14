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
    res.status(204).json({ message: "User deleted", data: null });
  } catch (err) {
    next(err);
  }
}

// GET /users/:id/stats
async function getUserStats(req, res, next) {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.id);
    const sessions = await Session.find({ "players.user": userId }).populate("game players.user");

    if (sessions.length === 0) {
      return res.json({ message: "No matches found", data: {} });
    }

    let wins = 0, losses = 0, draws = 0;
    const gameCounts = {}, opponentCounts = {}, opponentWins = {};

    for (const session of sessions) {
      const me = session.players.find(p => p.user && p.user._id.equals(userId));
      if (!me) continue;

      if (me.result === "Win") wins++;
      if (me.result === "Loss") losses++;
      if (me.result === "Draw") draws++;

      const title = session.game.name;
      gameCounts[title] = (gameCounts[title] || 0) + 1;

      for (const p of session.players) {
        if (!p.user || p.user._id.equals(userId)) continue;
        const oppId = p.user._id.toString();
        opponentCounts[oppId] = (opponentCounts[oppId] || 0) + 1;
        if (me.result === "Win") opponentWins[oppId] = (opponentWins[oppId] || 0) + 1;
      }
    }

    const mostPlayedGame = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const favoriteOpponentId = Object.entries(opponentCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const favoriteOpponent = sessions.flatMap(s => s.players).find(p => p.user && p.user._id.toString() === favoriteOpponentId)?.user;

    const winRateOpponents = Object.entries(opponentCounts)
      .filter(([_, count]) => count >= 2)
      .map(([id, total]) => ({
        opponentId: id,
        winRate: Math.round((opponentWins[id] || 0) / total * 100)
      }))
      .sort((a, b) => b.winRate - a.winRate);

    const topOpponentId = winRateOpponents[0]?.opponentId;
    const favoriteWinOpponent = sessions.flatMap(s => s.players).find(p => p.user && p.user._id.toString() === topOpponentId)?.user;

    const totalMatches = wins + losses + draws;

    res.json({
      message: "User stats calculated",
      data: {
        totalMatches,
        wins,
        losses,
        draws,
        mostPlayedGame,
        favoriteOpponent: favoriteOpponent ? {
          name: `${favoriteOpponent.firstName} ${favoriteOpponent.lastName}`,
          matchesTogether: opponentCounts[favoriteOpponentId]
        } : null,
        favoriteWinOpponent: favoriteWinOpponent ? {
          name: `${favoriteWinOpponent.firstName} ${favoriteWinOpponent.lastName}`,
          winRate: winRateOpponents[0]?.winRate + "%"
        } : null
      }
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
