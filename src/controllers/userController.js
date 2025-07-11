const User = require("../models/UserModel");
const Game = require("../models/GameModel");
const Session = require("../models/SessionModel");
const mongoose = require("mongoose");
const logUserActivity = require("../utils/logActivity");


// GET /users – Fetch all users
async function getAllUsers(req, res, next) {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    next(err);
  }
}


// POST /users – Create a new user
async function createUser(req, res, next) {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
}


// GET /users/:id – Get a specific user by ID
async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
}


// PUT /users/:id – Update user profile
async function updateUser(req, res, next) {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // Log the activity
    await logUserActivity(req.user._id, "Updated Profile");

    res.json(updated);
  } catch (err) {
    next(err);
  }
}


// DELETE /users/:id – Delete user
async function deleteUser(req, res, next) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}


// GET /users/:id/stats – Fetch user match statistics
async function getUserStats(req, res, next) {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.id);

    // Fetch all sessions where this user was a player
    const sessions = await Session.find({ "players.user": userId }).populate("game players.user");

    if (sessions.length === 0) {
      return res.json({ message: "No matches found", stats: {} });
    }

    // Counters
    let wins = 0, losses = 0, draws = 0;
    const gameCounts = {};
    const opponentCounts = {};
    const opponentWins = {};

    for (const session of sessions) {
      const me = session.players.find(p => p.user && p.user._id.equals(userId));
      if (!me) continue;

      // Tally result
      if (me.result === "Win") wins++;
      if (me.result === "Loss") losses++;
      if (me.result === "Draw") draws++;

      // Track games played
      const title = session.game.name;
      gameCounts[title] = (gameCounts[title] || 0) + 1;

      // Track opponents
      for (const p of session.players) {
        if (!p.user || p.user._id.equals(userId)) continue;
        const oppId = p.user._id.toString();

        opponentCounts[oppId] = (opponentCounts[oppId] || 0) + 1;

        if (me.result === "Win") {
          opponentWins[oppId] = (opponentWins[oppId] || 0) + 1;
        }
      }
    }

    // Most played game
    const mostPlayedGame = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Favorite (most frequent) opponent
    const favoriteOpponentId = Object.entries(opponentCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const favoriteOpponent = sessions
      .flatMap(s => s.players)
      .find(p => p.user && p.user._id.toString() === favoriteOpponentId)?.user;

    // Highest win rate opponent (min 2 matches)
    const winRateOpponents = Object.entries(opponentCounts)
      .filter(([id, count]) => count >= 2)
      .map(([id, total]) => {
        const winsAgainst = opponentWins[id] || 0;
        return {
          opponentId: id,
          winRate: Math.round((winsAgainst / total) * 100)
        };
      })
      .sort((a, b) => b.winRate - a.winRate);

    const topOpponentId = winRateOpponents[0]?.opponentId;
    const favoriteWinOpponent = sessions
      .flatMap(s => s.players)
      .find(p => p.user && p.user._id.toString() === topOpponentId)?.user;

    const totalMatches = wins + losses + draws;

    res.json({
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
    });

  } catch (err) {
    next(err);
  }
}


// Export all controller functions
module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats
};